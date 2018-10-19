#include <gecode/int.hh>
#include <gecode/search.hh>
#include <iostream>

using namespace Gecode;
using namespace std;

class Example : public Space {  
private:
  int          n;
  IntVarArray  x;
  explicit Example(Example &  e);
public:
  Example(int i_n);
  Example(bool share, Example &  s);
  
  virtual Space *  copy(bool share);
  void    getSolution(void);
};

Example::Example(int i_n)
  : n(i_n),
    x(this, n, 0, n-1)
{
	dom(this, x[1], 0, 1);
	dom(this, x[2], 0, 1);
	rel(this, x[0], IRT_NQ, x[1]);
	rel(this, x[1], IRT_NQ, x[2]);
	rel(this, x[2], IRT_NQ, x[0]);
	
  	branch(this, x, INT_VAR_NONE, INT_VAL_MIN);
}

Example::Example(bool share, Example& s) : Space(share,s) {
  n    = s.n;
  x.update ( this, share, s.x  );
}

Space*
Example::copy(bool share) {
  return new Example(share, *this);
}

void
Example::getSolution(void) {
  for (int i = 0; i < n; i++)
      cout << x[i].val() << " ";
  cout << endl;
}

//-----------------------------------------------
int main(int argc, char * argv[])
{

  Example *  root = new Example ( 3 );
  
  if (root->status() == SS_FAILED)
    {
      cout << "Bloop!!!" << endl;
      exit(EXIT_FAILURE);
    }

   Example *         working = static_cast< Example* >( root->clone() );
    
   //DFS< Example > *  e = new DFS< Example >(working, 1, 1);
   LDS< Example > *  e = new LDS< Example >(working, 8);
   Example *         ex = e->next();

	while ( ex != NULL ) {
		ex->getSolution();
		ex = e->next();
    }
   
    Search::Statistics stat = e->statistics();
    cout << endl
	 << "\tpropagations:  " << stat.propagate << endl
	 << "\tfailures:      " << stat.fail << endl
	 << "\tclones:        " << stat.clone << endl
	 << "\tcommits:       " << stat.commit << endl
	 << "\tpeak memory:   "
	 << static_cast<int>((stat.memory+1023) / 1024) << " KB"
	 << endl;

	delete ex;   
    delete e;
  
    return EXIT_SUCCESS;
}
