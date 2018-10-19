#include <vector>
#include "examples/support.hh"
#include "gecode/minimodel.hh"

const int PA_n = 15;
const int PA_Q = 90;
const int PA_q[PA_n] = {7,30,16,9,21,15,19,23,11,5,19,29,23,21,10};

class TestPB : public Space {
protected:
  IntVarArray succ;
  IntVarArray capa;
  IntVarArray tmpCapa;

public:
  TestPB() :
      succ(*this, PA_n, 0, PA_n-1),
      capa(*this, PA_n, 0, PA_Q),
      tmpCapa(*this, PA_n, 0, PA_Q)
  {
   for (int i=0; i<PA_n; i++)
    {
      post(*this, tmpCapa[i] == capa[i] + PA_q[i]);
      element(*this, capa, succ[i], tmpCapa[i]);
    }
  }

  TestPB(bool share, TestPB& s) : Space(share,s) {}
  virtual Space* copy(bool share) { return NULL; }

  virtual void
  print(std::ostream& os) const {
    for (int i = 0; i < succ.size(); i++)
      os << succ[i] << std::endl;
  }
};

int
main(int argc, char* argv[]) {
  TestPB p;
  StatusStatistics nbP;
  p.status(nbP);
  p.print(std::cout);
  std::cout << nbP.propagate << std::endl;
  return 0;
}

