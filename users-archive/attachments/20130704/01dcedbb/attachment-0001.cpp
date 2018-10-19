#include <gecode/int.hh>
#include <gecode/driver.hh>
#include <gecode/minimodel.hh>
#include <gecode/search.hh>

using namespace Gecode;

class E1 : public Script {
private :
	
	 static const int n =5;
protected:

	IntVarArray v1;

	IntVar v2;

public:

	E1(const Options&) : v1(*this, n*n,1,n*n), v2(*this,n*(n*n+1)/2,n*(n*n+1)/2){
		
		distinct (*this, v1);
	    IntVarArgs	rowArray  (*this,n , 1, n);
	    IntVarArgs  colArray  (*this,n , 1, n);
		IntVarArgs diag1Array (*this,n , 1, n);
		IntVarArgs diag2Array (*this,n , 1, n);

		
		
		//IntVarArgs sumConstraints ;

		for (int i =0; i<n;i++)
		{
			for (int j=0; j<n; j++)
			{
				rowArray[j]= v1[i*n+1];
				colArray[j]= v1[j*n+1];
			}
	
	//	rel (*this, sum(rowArray),IRT_EQ, v2);
      //  rel ( *this , sum(colArray), IRT_EQ ,v2);

	    linear( *this , rowArray, IRT_EQ, v2);
		linear( *this , colArray, IRT_EQ, v2);
		diag1Array[i]=v1[i * n + i];
		diag2Array[i]= v1[i*n+n-i-1];
		}

		//rel(*this , sum(diag1Array), IRT_EQ,v2);
		//rel(*this, sum(diag2Array), IRT_EQ,v2);

	
		linear( *this , diag1Array, IRT_EQ, v2);
		linear( *this , diag2Array, IRT_EQ, v2);


		// post branching
		branch(*this, v1, INT_VAR_SIZE_MIN(), INT_VAL_MIN());

	}
       // search support
		E1(bool share, E1& s) : Script(share, s) {
			v1.update(*this, share, s.v1);
			v2.update(*this, share, s.v2);
			
		}

		virtual Space* copy(bool share) {
        return new E1(share,*this);
		}

		// print solution
		void print(std::ostream& os) const  {
			for(int i = 0; i < n; i++) {
			for(int j = 0; j < n; j++) {
				 v1[i * n + j];
				 os << v1[i * n + j] << std::endl;
      }
      }
    }
};
// main function
int main(int argc, char* argv[]) {
//  // create model and search engine
//  E1* m = new E1;
//  DFS<E1> e(m);
//  delete m;
//   // search and print all solutions
//  while (E1* s = e.next()) {
//    s->print(); delete s;
//  }
  Options opt("Test Problem");
  opt.parse(argc,argv);
  Script::run<E1,DFS,Options>(opt);
  return 0;
}