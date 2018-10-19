#include <gecode/kernel.hh> 
#include <gecode/int.hh>
#include <gecode/search.hh>
#include <gecode/set.hh>
#include <gecode/minimodel.hh>

#include <vector>
#include <iomanip>

// csplib.org --> prob024
// Rafael Meneses Osorio
// http://www.zeke.cl
// http://www.labsd.inf.utfsm.cl/~rmeneses


class LangFordNumberProblem: public Gecode::Space{
protected:
  int k;
  int n;
  Gecode::IntVarArray positionOfNumbers;
  
public:
  LangFordNumberProblem(int k_,int n_)
    :k(k_),n(n_),positionOfNumbers(this,k*n,0,(k*n)-1) //arrange k sets of numbers 1 to n
  {
    
    for(int i=0;i<n;i++){
      Gecode::IntVarArgs sameNumber(k); 
      for(int j=0;j<k;j++){
	sameNumber[j]=positionOfNumbers[i+j*n];
      }
      
      for(int ii=1;ii<k;ii++) //each appearance of the number m is m numbers on from the last
	Gecode::post(this,Gecode::abs(this,Gecode::post(this,sameNumber[ii]-sameNumber[ii-1])) == ((i+1)+1)) ; 
    }
    
    Gecode::distinct(this,positionOfNumbers); 
    
    Gecode::branch(this,positionOfNumbers,Gecode::BVAR_SIZE_MIN,Gecode::BVAL_MIN);    
    
  }
  
  LangFordNumberProblem(bool share,LangFordNumberProblem& problem)
    :Gecode::Space(share,problem),k(problem.k),n(problem.n)
  {
    positionOfNumbers.update(this,share,problem.positionOfNumbers);
  }
  
  virtual Gecode::Space* copy(bool share){
    return new LangFordNumberProblem(share,*this);
  }
  
  virtual void print() const{
    std::vector<int> secuence(k*n);
    
    for(int s=0;s<k;s++)
      for(int i=0;i<n;i++)
	secuence[positionOfNumbers[i+s*n].val()]=i+1;
    
    std::cout<<"Lang Ford's Number L("<<k<<","<<n<<"): "<<std::endl;
    for(unsigned i=0;i<secuence.size();i++)
      std::cout<<std::setw(2)<<secuence[i];
    std::cout<<std::endl;  
  }
};  


int main(int argc,char **argv){

  LangFordNumberProblem *problem=new LangFordNumberProblem(2,4);
  
  LangFordNumberProblem *solucion=Gecode::dfs(problem);
  
  solucion->print();

  return 0;
}