
#include <gecode/int.hh>
#include <gecode/search.hh>

using namespace Gecode;

class ModTest : public Space {
protected:
  IntVarArray l;
public:
  ModTest(void) : l(*this, 3) {

    l[0] = IntVar(*this,-7,-7);
    l[1] = IntVar(*this,12,12);
    l[2] = IntVar(*this,5,5);
    
    mod(*this,l[0],l[1],l[2]);
    // post branching
    branch(*this, l, INT_VAR_SIZE_MIN, INT_VAL_MIN);
  }
  // search support
  ModTest(bool share, ModTest& s) : Space(share, s) {
    l.update(*this, share, s.l);
  }
  virtual Space* copy(bool share) {
    return new ModTest(share,*this);
  }
  // print solution
  void print(void) const {
    std::cout << l << std::endl;
  }
};

// main function
int main(int argc, char* argv[]) {
  // create model and search engine
  ModTest* m = new ModTest;
  DFS<ModTest> e(m);
  delete m;
  assert(e.next()!=NULL);
  return 0;
}
