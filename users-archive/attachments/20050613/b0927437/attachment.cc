#include "examples/support.hh"
class TestBug : public Example {
public:
   SetVarArray S;
   IntVarArray w;

  TestBug(const Options& o): S(this,2), w(this,1,0,2){
          BoolVarArray I(this,2,0,1);
         IntVarArgs iv(2);
         for (int i=0 ; i<2 ; i++){ 
            intersect(this,S[i],0,1); 
            cardRange(this,S[i],1,1); 
            include(this,S[i],1,I[i]);
            iv[i] = I[i];
         }
         linear(this,iv,REL_EQ,w[0]);

         branch(this,S,SETBVAR_NONE, SETBVAL_MIN);
    }
  forceinline
  TestBug(TestBug& s, bool share) 
    : Example(s,share),  S(s.S.copy(this)), w(s.w.copy(this))
  {}

  virtual Space* 
  copy(bool share) { 
    return new TestBug(*this,share); 
  }
  void  
          constrain(Space * s) {
                  rel(this, w[0], REL_GR, ((TestBug*) s)->w[0].val());
          }

  virtual void 
  print(void) {
          cout << "####### Sol #######" << endl;
         cout << "cost:" << w[0].val() << endl << "vals: ";
         for (int i=0 ; i<2 ; i++){ 
                 cout << S[i].lubMax()<< " ";
         }
         cout << endl;

  }
};


int
main(int argc, char** argv) {
  Options o("TestBug");
  o.parse(argc,argv);
  o.solutions  = 0;
  Example::run<TestBug,Search::BAB<TestBug> >(o);
  return 0;
}

