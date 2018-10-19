#include <gecode/driver.hh>
#include <gecode/int.hh>
#include <gecode/search.hh>
#include <gecode/minimodel.hh>

using namespace Gecode;

class MMKP : public Script{

protected:
	static const int n=4 ;//number of testers
	static const int m=5;// number of nodes
	IntArgs R;
	IntArgs C;
	IntArgs B;
	IntArgs Dr;
	IntArgs Dc;
	IntArgs Db;
	IntArgs g;

	IntVarArray a;
	IntVarArray k;
	IntVar l;
public :
	enum {
    find_Optimal_Solution, find_realizable_solution
  };
	MMKP (const Options& opt) : a(*this,n*m, 0,1){

		R=IntArgs(4,10,15,20,40);
		C=IntArgs(4,20,25,30,40);
		B=IntArgs(4,20,30,35,40);

		Dr=IntArgs(4,5,10,15,25);
		Dc=IntArgs(4,15,20,35,37);
		Db=IntArgs(4,10,15,20,35);


		k=IntVarArray(*this,n*m ,0,100000); 
		Matrix <IntVarArray> results(k, n,m);

		//creation variables

		//IntVarArray a(*this,n*m,0,1); // Array of n*m boolean variables
		Matrix <IntVarArray> X (a,n,m);// Matrix "view" of the array a

		// objectiv variable
		IntVar gain (*this, 1,1000000);


		//creation of constraints 
			// ... over rows
		for ( int j=0; j<n;j++)
		{

				linear(*this , X.row(j),IRT_EQ,1);
			
		}

		//... over columns
			// first, get the columns, we will use an intermidiare matrix XDual

		IntVarArray b(*this, m*n,0,1);
		Matrix <IntVarArray> XDual (b, m, n);
		for (int i=0; i<m;i++)
		{
			for ( int j =0; j<n ; j++)
			{
				XDual(i,j)=X(j,i);
			}
		}

		for (int j = 0; j < m; j++) {

			linear(*this, Dr,XDual.row(j),IRT_NQ, R[j]);
		}

		for (int j = 0; j < m; j++) {
			linear (*this, Dc, XDual.row(j), IRT_NQ,C[j]);

		}

		for (int j = 0; j < m; j++) {
			linear (*this, Db, XDual.row(j), IRT_NQ,B[j]);

		}
		switch (opt.model()) {
        case find_Optimal_Solution:

			g=IntArgs(4,20,30,40,50);
		//Objective function

		for (int i = 0; i < n; i++)
		{
			linear(*this, g,X.row(i), IRT_EQ, gain);

		}
		for ( int i=0; i<n;i++){
			for ( int j =0; j<m;j++)
			{
				results(i,j)=X(i,j);
			}
		}

		break;

		case find_realizable_solution:
			for ( int i=0; i<n;i++){
			for ( int j =0; j<m;j++)
			{
				results(i,j)=X(i,j);
			}
		}
        break;

		    // post branching
        branch(*this, a, INT_VAR_SIZE_MAX(), INT_VAL_MAX());
		}
	}
		// search support
     MMKP(bool share, MMKP& s) : Script(share, s){
      a.update(*this, share, s.a);
    }

    virtual Space* copy(bool share) {
      return new MMKP(share,*this);
    }

	    // print solution
    void print(std::ostream& os) const  {
		for(int i = 0; i < n; i++) {
		 for(int j = 0; j < n; j++)
           os << std::setw(4) << a[i * n + j];
		 os << std::endl;
	}
}
	};

	// main function
int main(int argc, char* argv[]) {
  Options opt("MMKP");
  opt.model(MMKP::find_Optimal_Solution);
  opt.model(MMKP::find_realizable_solution);

  opt.parse(argc,argv);
  Script::run<MMKP,DFS,Options>(opt);
  return 0;
}
