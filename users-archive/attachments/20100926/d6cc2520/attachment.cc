#include "gecode/int.hh"
#include "gecode/search.hh"
#include "gecode/minimodel.hh"
#include <iostream>

using namespace std;
using namespace Gecode;

struct bug: public Space
{
  IntVarArray X;
  IntVar N;
  bug(): X(*this, 4*4, 0, 1), N(*this, 0, 1000000)
  {
    Matrix<IntVarArray> MX(X, 4, 4);
    for (int i=0; i<4; ++i)
      {
	linear(*this, MX.col(i), IRT_EQ, 1);
	linear(*this, MX.row(i), IRT_EQ, 1);
      }
    IntArgs C(4*4);
    Matrix<IntArgs> MC(C, 4, 4);
    MC(0,0)=7; MC(0,1)=1; MC(0,2)=3; MC(0,3)=4;
    MC(1,0)=8; MC(1,1)=2; MC(1,2)=5; MC(1,3)=1;
    MC(2,0)=4; MC(2,1)=3; MC(2,2)=7; MC(2,3)=2;
    MC(3,0)=3; MC(3,1)=1; MC(3,2)=6; MC(3,3)=8;
    // comment this out
    linear(*this, C, X, IRT_EQ, N);

    branch(*this, X, INT_VAR_SIZE_MIN, INT_VAL_MIN);
  }

  bug(bool share, bug& b): Space(share, b)
  {
    X.update(*this, share, b.X);
    N.update(*this, share, b.N);
  }

  virtual Space* copy(bool share)
  { return new bug(share, *this); }

  void print() const
  {
    cout << "N = " << N << endl;
    Matrix<IntVarArray> MX(X, 4, 4);
    cout << MX << endl;
  }
};

int main()
{
  bug* model = new bug;
  DFS<bug> engine(model);
  delete model;
  while (bug* solution = engine.next())
    {
      solution->print();
      delete solution;
    }
  return 0;
}
