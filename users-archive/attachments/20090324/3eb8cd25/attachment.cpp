#include <vector>
#include "examples/support.hh"
#include "gecode/minimodel.hh"

const int PA_n = 15;
const int PA_Q = 90;
const int PA_q[PA_n] = {7,30,16,9,21,15,19,23,11,5,19,29,23,21,10};
const int PA_d[(PA_n+1)*(PA_n+1)] = {
  0,153,369,965,493,281,521,136,586,1157,146,436,1753,725,1297,193,
  153,0,234,1370,442,788,1220,493,265,788,113,613,2512,1418,1258,442,
  369,234,0,2468,1300,1250,1226,445,961,1850,629,1465,3730,2084,2560,1060,
  965,1370,2468,0,416,442,1378,1417,1073,986,709,157,226,320,356,296,
  493,442,1300,416,0,650,1618,1105,153,202,125,85,1250,928,212,200,
  281,788,1250,442,650,0,272,325,1157,1576,477,325,740,106,1186,130,
  521,1220,1226,1378,1618,272,0,197,2125,2920,1109,1157,1588,466,2570,698,
  136,493,445,1417,1105,325,197,0,1282,2081,562,900,2045,761,2141,485,
  586,265,961,1073,153,1157,2125,1282,0,145,164,442,2273,1681,545,533,
  1157,788,1850,986,202,1576,2920,2081,145,0,481,521,2132,1962,250,802,
  146,113,629,709,125,477,1109,562,164,481,0,202,1625,901,661,145,
  436,613,1465,157,85,325,1157,900,442,521,202,0,725,461,281,65,
  1753,2512,3730,226,1250,740,1588,2045,2273,2132,1625,725,0,338,1042,850,
  725,1418,2084,320,928,106,466,761,1681,1962,901,461,338,0,1252,328,
  1297,1258,2560,356,212,1186,2570,2141,545,250,661,281,1042,1252,0,612,
  193,442,1060,296,200,130,698,485,533,802,145,65,850,328,612,0
};

class TestPB : public Example {
protected:
  IntVarArray succ;
  IntVarArray capa;
  IntVarArray tmpCapa;

public:
  TestPB(const SizeOptions& opt) :
      succ(*this, PA_n * 3, 0, 3*PA_n-1),
      capa(*this, PA_n * 3, 0,PA_Q),
      tmpCapa(*this, PA_n, 0, PA_Q)
  {
    IntVarArgs costs(PA_n*3);
    IntArgs d(PA_n*3);

    unsigned long int costSumMax=0;
    for (int i=0; i<PA_n; i++)
    {
      int m=0;
      for (int j=0; j < PA_n; j++)
      {
        m = std::max(m,PA_d[i*PA_n+j]);
        d[j]=PA_d[i*PA_n+j];
      }
      int distToBase=PA_d[i*PA_n+PA_n];
      m = std::max(m,distToBase);
      for (int j=PA_n; j < 3*PA_n; j++)
        d[j]=distToBase;

      costs[i].init(*this,0,m);
      costSumMax+=m;
      element(*this, d, succ[i], costs[i]);
    }
    for (int i=PA_n; i<2*PA_n; i++)
    {
      int m=0;
      for (int j=0; j < PA_n; j++)
      {
        int distFromBase=PA_d[PA_n*PA_n+j];
        m = std::max(m,distFromBase);
        d[j]=distFromBase;
      }
      for (int j=PA_n; j < 3*PA_n; j++)
        d[j]=0;

      costs[i].init(*this,0,m);
      costSumMax+=m;
      element(*this, d, succ[i], costs[i]);
    }
    for (int i=2*PA_n; i<3*PA_n; i++)
      costs[i].init(*this,0,0);

   for (int i=0; i<PA_n; i++)
    {
      post(*this, tmpCapa[i] == capa[i] + PA_q[i]);
      element(*this, capa, succ[i], tmpCapa[i]);
    }
    for (int i=PA_n; i<2*PA_n; i++)
    {
      rel(*this, capa[i], IRT_EQ, 0);
      element(*this, capa, succ[i], 0);
    }

    distinct(*this, succ, opt.icl());
    for (int i=2*PA_n; i < 3*PA_n; i++)
      rel(*this, succ[i], IRT_EQ, i-PA_n);

    branch(*this, succ,  INT_VAR_MIN_MIN, INT_VAL_MIN);
  }

  TestPB(bool share, TestPB& s) : Example(share,s)
  {
    succ.update(*this, share, s.succ);
    capa.update(*this, share, s.capa);
    tmpCapa.update(*this, share, s.tmpCapa);
  }
  virtual Space* copy(bool share) { return new TestPB(share,*this); }

  virtual void
  print(std::ostream& os) const {
    for (int i = 0; i < succ.size(); i++)
      os << succ[i] << std::endl;
  }
};

int
main(int argc, char* argv[]) {
  SizeOptions opt("Test");
  Example::run<TestPB,DFS,SizeOptions>(opt);
  return 0;
}

