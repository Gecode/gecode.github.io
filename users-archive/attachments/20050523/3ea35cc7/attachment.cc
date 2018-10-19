#include "examples/support.hh"
class TestBug : public Example {
public:
   SetVarArray S;

  TestBug(const Options& o): S(this,3){
         for (int i=0 ; i<3 ; i++){ 
            intersect(this,S[i],0,5); 
         }
         cardRange(this,S[2],0,0); //< S[2] is the empty set
         // 0 \notin S[1] \leftrightarrow S[0] = \emptyset 
         BoolVarArray b(this,2,0,1);
         include(this,S[1],0,b[0]);
         bool_not(this,b[0],b[1]);
         equal(this,S[0],S[2],b[1]); 
         branch(this,S,SETBVAR_NONE, SETBVAL_MIN);
    }
  forceinline
  TestBug(TestBug& s, bool share) 
    : Example(s,share),  S(s.S.copy(this))
  {}

  virtual Space* 
  copy(bool share) { 
            //cout << "copy" <<endl;cout.flush();
    return new TestBug(*this,share); 
  }

  virtual void 
  print(void) {
  }
};


int
main(int argc, char** argv) {
  Options o("TestBug");
  o.parse(argc,argv);
  Example::run<TestBug,Search::DFS<TestBug> >(o);
  return 0;
}

