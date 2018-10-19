#include <gecode/driver.hh>
#include <gecode/int.hh>
#include <gecode/minimodel.hh>

using namespace Gecode;

class CumulativesTest : public MaximizeSpace {
public:
  IntVarArray x;
  IntVar CostValue;
  CumulativesTest() : x(*this,6,0,10),CostValue(*this,1,1) {
	IntVarArgs start(3);
	IntVarArgs end(3);
	IntVarArgs CostCoefficient(3);
	
    IntArgs m(3);
    IntArgs p(3);
    IntArgs u(3);
    IntArgs c(1);
    
    c[0] = 0;
    
    
    int machine[3] = {0,0,0};    
    int duration[3] = {5,5,10}; 
    int capacity[3] =  {-3,-9,10};
    int earlyStart[3] = {0,0,0};
    int lateStart[3] = {10,10,0};
    
    for(int i = 0;i<3;i++){
		m[i] = machine[i];
		p[i] = duration[i];
		u[i] = capacity[i];
		start[i] = x[i];
		end[i] = x[i+3];
		rel(*this,start[i]<=lateStart[i]);
		rel(*this,start[i]>=earlyStart[i]);
		rel(*this, start[i]+p[i]==end[i]);
		
		// The cost of source is 0 
		CostCoefficient[i] = expr(*this,
			(start[i]+1)*capacity[i]*(earlyStart!=lateStart)
						);
		
	}  
		

   
    cumulatives(*this, m,start,p,end,u,c,false);
    
    	//Compute cost of the problem
	CostValue = expr(*this,sum(CostCoefficient));
	
    branch(*this, end, INT_VAR_MAX_MAX, INT_VAL_MAX);
    branch(*this, start, INT_VAR_MIN_MIN, INT_VAL_MIN);
  }

  CumulativesTest(bool share, CumulativesTest& s) : MaximizeSpace(share,s) {
    x.update(*this, share, s.x);
  }

  virtual Space*
  copy(bool share) {
    return new CumulativesTest(share,*this);
  }
  
	IntVar cost(void) const { return CostValue;}
		
  /// Print solution
  virtual void
  print(std::ostream& os) const {
    os << x <<std::endl;
  }
};

int
main(int argc, char* argv[]) {
	
	CumulativesTest* DFSmodel = new CumulativesTest;
  	std::cout<<"DFS"<<std::endl;
	DFS<CumulativesTest> DFSsolutions(DFSmodel);
	while(CumulativesTest *DFSsolution = DFSsolutions.next())
	{	
		DFSsolution->print(std::cout);
		delete DFSsolution;
	}
	delete DFSmodel;

	std::cout<<"BAB"<<std::endl;
	CumulativesTest* BABmodel = new CumulativesTest;
	BAB<CumulativesTest> BABsolutions(BABmodel);
	while(CumulativesTest *BABsolution = BABsolutions.next())
	{	
		BABsolution->print(std::cout);
		delete BABsolution;
	}
	delete BABmodel;
	
	return 0;
}