#include "gecode/support.hh" 
#include <gecode/minimodel.hh>
#include "gecode/set.hh"
#include <gecode/driver.hh>
#include <gecode/int.hh>
#include <gecode/gist.hh>
#include <vector>
#include <stdio.h>

using namespace Gecode;

class
Test : public Script{
  IntVarArray test;
public:
  Test(const Options& opt){
  
    int i=0;

    int values[16];
    
    values[0]=0;
    values[1]=53;
    values[2]=52;
    values[3]=51;
    values[4]=50;
    values[5]=49;
    values[6]=48;
    values[7]=47;
    values[8]=45;
    values[9]=43;
    values[10]=42;
    values[11]=58;
    values[12]=57;
    values[13]=56;
    values[14]=55;
    values[15]=54;
    
    IntSet domi(values,16);

    test = IntVarArray(*this,220,domi);
    IntVarArray cardinality(*this,16);
    
    cardinality[0]=IntVar(*this,0,18);
    cardinality[1]=IntVar(*this,0,50);
    cardinality[2]=IntVar(*this,0,22);
    cardinality[3]=IntVar(*this,0,10);
    cardinality[4]=IntVar(*this,0,24);
    cardinality[5]=IntVar(*this,0,4);
    cardinality[6]=IntVar(*this,0,4);
    cardinality[7]=IntVar(*this,0,4);
    cardinality[8]=IntVar(*this,0,30);
    cardinality[9]=IntVar(*this,0,4);
    cardinality[10]=IntVar(*this,0,2);
    cardinality[11]=IntVar(*this,0,4);
    cardinality[12]=IntVar(*this,0,6);
    cardinality[13]=IntVar(*this,0,6);
    cardinality[14]=IntVar(*this,0,30);
    cardinality[15]=IntVar(*this,0,2);
    
    IntArgs vals(16);
    for(i=0;i<16;i++){
      vals[i]=values[i];
      count(*this,test,vals[i],IRT_EQ,cardinality[i]);
    }
    
    //count(*this,test,cardinality,vals,ICL_DOM);
    
    branch(*this,test,INT_VAR_SIZE_MIN, INT_VAL_MIN);
    
  }


  Test(bool share, Test& ss): Script(share,ss){
    test.update(*this,share,ss.test);
  }
  
  
  Space* copy(bool share){
    return new Test(share,*this);
  }
  
  void print(std::ostream& os) const{
    os<<test<<std::endl;
  }
  

};


int main(int argc, char* argv[]) {

  Options opt("test");
  opt.solutions(0);
  //opt.time=10;
  opt.iterations(20000);
  opt.parse(argc,argv);
  opt.c_d(1);
  opt.a_d(1);
  opt.mode(SM_GIST);

  Script::run<Test,DFS>(opt);  
  
  return 0;
}


