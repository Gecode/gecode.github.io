
#include "gecode/kernel.hh"
#include "gecode/int.hh"

#include <iostream>

using namespace Gecode;

class A: public Space {
public:
  A(void) {}
  virtual Space* copy(bool share) {
    return new A(*this);
  }
};


class VarReflector : public Gecode::UnaryPropagator<Gecode::Int::IntView, Gecode::PC_GEN_ASSIGNED> {
public:
  VarReflector(Gecode::Space* s, Gecode::Int::IntView v) :
    UnaryPropagator<Gecode::Int::IntView, Gecode::PC_GEN_ASSIGNED>(s, v) {}

  VarReflector(Gecode::Space* s, bool share, VarReflector& p) :
    UnaryPropagator<Gecode::Int::IntView, Gecode::PC_GEN_ASSIGNED>(s, share, p) {}

  Gecode::Actor* copy(Gecode::Space* s, bool share) {
    return new (s) VarReflector(s, share, *this);
  }

  Gecode::ExecStatus propagate(Gecode::Space* s) {
    return Gecode::ES_SUBSUMED;
  }
};



int main() {
  A *S1 = new A();  
  A *S2 = new A();
  
  IntVar X1(S1,1,5);
  IntVar XTMP(S1,1,3);
  IntVar X2;
  X2.update(S2,false, X1);    
  eq(S1,X1,XTMP);

  //new (S2) VarReflector(S2, X2);    
  //new (S1) VarReflector(S1, X1);  

  return 0;
}