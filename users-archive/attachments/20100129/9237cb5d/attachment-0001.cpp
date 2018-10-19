
#include <gecode/int.hh>
#include <gecode/search.hh>

using namespace Gecode;

class Model : public Space {
protected:
  IntVarArray vars;
public:
  Model(void) : Space(), vars(*this, 2, 0, 1){
	  rel(*this, vars[0], IRT_EQ, 0);
  };
  
  Model(bool share, Model& s) : Space(share, s) {
    vars.update(*this, share, s.vars);
  }

  virtual Space* copy(bool share) {
    return new Model(share,*this);
  }

  void print(void) const {
    std::cout << vars << std::endl;
  }

  void newVar(){
	 vars.add(*this, IntVar(*this, 0, 1));
  }

  void postEQ(int i, int j){
	rel(*this, vars[i], IRT_EQ, vars[j]);
  }

};


int main(int argc, char* argv[]) {
  Model* m = new Model;
  m->newVar();
  m->newVar();
  m->postEQ(2,0);
  m->postEQ(3,1);
  m->status();
  m->print();

 //------------------//

  Model* m2 = dynamic_cast<Model*>(m->copy(true));  
  m2->newVar();
  m2->newVar();
  m2->postEQ(4,0);
  m2->postEQ(5,1);
  m2->status();
  m2->print();

  return 0;
}


