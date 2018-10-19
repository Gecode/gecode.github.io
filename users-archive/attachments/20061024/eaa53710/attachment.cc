#include <iostream>
#include <vector>
#include <algorithm>

#include <gecode/kernel.hh> 
#include <gecode/int.hh>
#include <gecode/search.hh>
#include <gecode/set.hh>
#include <gecode/minimodel.hh>

#include <cstdlib>

//Generate random number in [0,max]
int getRandom(int max){
  return  (int) ((double (max+1))*((double) rand() /((double)(RAND_MAX+1.0))));
}

void setRandomSeed(int s){
  srand(s);
}


class TheBug: public Gecode::Space{
protected:
  Gecode::IntVar       cost;
  Gecode::IntVarArray  x;
  
public:
  TheBug()
    : cost(this,-50*28*4,200*28*4),
      x(this,28*4,0,1)
  {
    
    for(int d=0;d<28;d++){
      Gecode::IntVarArgs dia(4);
      
      for(int p=0;p<4;p++)
	dia[p]=x[p+d*4];
      
      Gecode::linear(this,dia,Gecode::IRT_EQ,1);
    }
    
    Gecode::IntArgs coeficientes(28*4);
    
    for(int d=0;d<28;d++)
      for(int p=0;p<4;p++)
	{
	  int aleatorio=getRandom(2);
	  if(aleatorio==0){
	    coeficientes[p+d*4]=-50;
	  }
	  else if(aleatorio==1){
	    coeficientes[p+d*4]=100;
	  }
	  else
	    coeficientes[p+d*4]=200;
	}
    
    Gecode::linear(this,coeficientes,x,Gecode::IRT_EQ,cost);
    
    Gecode::IntVarArgs distribucion(28*4);
    
    std::vector<int> mapping;
    for(int i=0;i<(28*4);i++)
      mapping.push_back(i);
    
    std::random_shuffle(mapping.begin(),mapping.end());
    
    for(int i=0;i<28*4;i++){
      distribucion[i]=x[mapping[i]];
    }
    
    Gecode::branch(this,distribucion,Gecode::BVAR_NONE,Gecode::BVAL_MAX);
    
    Gecode::IntVarArgs distribucionCost(1);
    distribucionCost[0]=cost;
    
    Gecode::branch(this,distribucionCost,Gecode::BVAR_NONE,Gecode::BVAL_MIN);
  }
  
  TheBug(bool share, TheBug& b)
    :Space(share,b)
  {
    cost.update(this,share,b.cost);
    x.update(this,share,b.x);
  }

  virtual TheBug* copy(bool share)
  {
    return new TheBug(share,*this);
  }
  
  void constrain(Gecode::Space* s)
  {
    Gecode::rel(this,cost,Gecode::IRT_LE,static_cast<TheBug*>(s)->cost.val());
  }

  int getCost(){
    return cost.val();
  }
  
};


int main(int argc,char **argv)
{
  setRandomSeed(123);
  
  for(;;){
    
    TheBug* problem=new TheBug();
    
    Gecode::Search::TimeStop* stop=new Gecode::Search::TimeStop(200);    
    
    //With recomputation, sure crash 
    Gecode::BAB<TheBug> engine(problem,8,2,stop);
    
    //Without recomputation, never crash 
    //Gecode::BAB<TheBug> engine(problem,1,2,stop);

    
    TheBug* result=NULL;
    for(;;){
      TheBug* temp=engine.next();
      if(temp!=NULL){
	std::cout<<"Solution cost:="<<temp->getCost()<<std::endl;
	if(result!=NULL)
	  delete result;
	result=temp;
      }
      else{
	std::cout<<"Finish"<<std::endl;
	break;
      }
    }
    
    if(result!=NULL){
      std::cout<<"Solution with cost:="<<result->getCost()<<std::endl;
      delete result;
    }
    else
      std::cout<<"No Solution"<<std::endl;
    
    delete problem;
    delete stop;
  }
  
  return 0;
}
