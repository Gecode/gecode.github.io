#include "examples/support.hh" 
#include "gecode/minimodel.hh"

class Money : public Example {
protected:
  static const int nl = 10;
  IntVarArray PODCells;
  BoolVarArray AoverStowage;
  IntVar ObjAOv;
  BoolVarArray Aba;
  
public:
  Money(const Options& opt) : PODCells(this,nl,0,3) {
    int Lstacks=1;
    int Ltiers=10;
    int i;
    int j;


    AoverStowage = BoolVarArray(this,(Ltiers*Lstacks),0,1);
    Aba = BoolVarArray(this,(Ltiers*Ltiers*Lstacks),0,1);

    for(i=0;i<Lstacks;i++){
      BoolVarArgs boolTmpa(10);
      for(j=0;j<10;j++){
	boolTmpa[j]=Aba[j];
	rel(this,Aba[j],IRT_EQ,0);
      }
      linear(this,boolTmpa,IRT_GR,0,AoverStowage[i]);

      for(j=1;j<Ltiers;j++){

	for(int k=0;k<j;k++){
	  rel(this,PODCells[i*Ltiers+k],IRT_EQ,PODCells[i*Ltiers+j],Aba[j*Ltiers+k]);
	  boolTmpa[k]=Aba[j*Ltiers+k];
	}

	for(int w=j;w<Ltiers;w++){
	  rel(this,Aba[j*Ltiers+w],IRT_EQ,0);
	  boolTmpa[w]=Aba[j*Ltiers+w];
	}
	  
	linear(this,boolTmpa,IRT_GR,0,AoverStowage[i*Ltiers+j]);
      }
    }


 
    ObjAOv = IntVar(this,0,Int::Limits::max);
    
    linear(this,AoverStowage,IRT_EQ,ObjAOv);
    branch(this, PODCells, INT_VAR_SIZE_MAX, INT_VAL_MAX);
   }





void constrain(Space *s){
    
    //std::cout<<"begin here the new constraints"<<std::endl;
 
    rel(this,ObjAOv,IRT_LE,static_cast<Money*>(s)->ObjAOv.min());
}

   virtual void
   print(std::ostream& os) {
     int i;

     os<<"Values in the stack:"<<std::endl;

     for(int k=1-1;k>=0;k--){
      for(int w=0;w<10;w++){
	i=k+(w*1);
	os<<PODCells[i]<<"|";    
      }
      os<<std::endl;
      
    }
    
    os<<std::endl;
    
    os<<"Reified variables for each position:"<<std::endl;
 
    for(int k=1-1;k>=0;k--){
      for(int w=0;w<10;w++){
	i=k+(w*1);
	os<<AoverStowage[i]<<"|";    
      }
      os<<std::endl;
      
    }
 
   os<<"Set of reified variables for each position:"<<std::endl;    
    for(int i=0;i<10;i++){
      for(int j=0;j<10;j++)
	os<<Aba[i*10+j]<<" - ";
      os<<std::endl;
     }
 
    os<<std::endl;

    os<<std::endl;
    os<<"Obj = "<<ObjAOv<<std::endl;
    os<<"----------------------------------";    
    os<<std::endl;
   }

   Money(bool share, Money& s) : Example(share,s) {
     PODCells.update(this, share, s.PODCells);
     AoverStowage.update(this, share, s.AoverStowage);
     ObjAOv.update(this, share, s.ObjAOv);
     Aba.update(this,share,s.Aba);

   }
   virtual Space*
   copy(bool share) {
     return new Money(share,*this);
   }
 };
 
 int
 main(int argc, char* argv[]) {
   Options opt("SEND+MORE=MONEY");

   opt.solutions(0);
   opt.iterations(20000);
   opt.parse(argc,argv);
   Example::run<Money,BAB>(opt);
   return 0;
 }