#include <gecode/int.hh>
#include <gecode/driver.hh>
#include <gecode/minimodel.hh>
#include <gecode/search.hh>

using namespace Gecode;

class E1 : public Script {
private :
   static const int n =5;
protected:
  IntVarArray X;

public:

  E1(const Options&) : X(*this, n*n,1,n*n) {
    
    distinct (*this, X);
    int y = n*(n*n+1)/2; 
    
    for (int i=0;i<n;i++)
    {
      IntVarArgs row = X.slice(i*n, 1, n);
      IntVarArgs col = X.slice(i, n, n);
      linear( *this, row, IRT_EQ, y);
      linear( *this, col, IRT_EQ, y);
    }
    IntVarArgs diag1 = X.slice(0, n+1, n);
    IntVarArgs diag2 = X.slice(n-1, n-1, n);

    linear( *this, diag1, IRT_EQ, y);
    linear( *this, diag2, IRT_EQ, y);

    // post branching
    branch(*this, X, INT_VAR_SIZE_MAX(), INT_VAL_MAX());
    }
    // search support
    E1(bool share, E1& s) : Script(share, s) {
      X.update(*this, share, s.X);
    }

    virtual Space* copy(bool share) {
      return new E1(share,*this);
    }

    // print solution
    void print(std::ostream& os) const  {
      std::cout << "Value: " << n*(n*n+1)/2 << std::endl; 
      for(int i = 0; i < n; i++) {
        for(int j = 0; j < n; j++)
           os << std::setw(4) << X[i * n + j];
        os << std::endl;
      }
    }
};
// main function
int main(int argc, char* argv[]) {
  Options opt("Test Problem");
  opt.parse(argc,argv);
  Script::run<E1,DFS,Options>(opt);
  return 0;
}
