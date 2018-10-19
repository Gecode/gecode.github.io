						\
#include <gecode/driver.hh>
#include <gecode/minimodel.hh>

using namespace Gecode;

class LH : public LocalHandle {
public:
  class LHO : public LocalObject {
  public:
    int* data;
    int size;
    
    LHO(Space& home, int size0) : LocalObject(home), size(size0) {
      data = (int*)malloc(sizeof(int)*size*size);
      // Removing this line makes the program work
      home.notice(*this, AP_DISPOSE);
    }
    
    LHO(Space& home, bool share, LHO& d) : LocalObject(home,share,d), data(heap.alloc<int>(d.size*d.size)), size(d.size) {}
    
    virtual LocalObject* copy(Space& home, bool share) {
      return new (home) LHO(home,share,*this);
    }
    
    virtual size_t dispose(Space& home) {
      home.ignore(*this, AP_DISPOSE);
      free(data);
      // heap.free<int>(data, size*size);
      return sizeof(*this);
    }
  };
  
  LH(Space& home, int size0) : LocalHandle(new (home) LHO(home, size0)) {};
  LH(const LH& data) : LocalHandle(data) {};
};

class MyScript : public IntMinimizeScript {
public:
  static const int count = 20;
  IntVarArray V;
  LH lh;  
  
  MyScript(const SizeOptions& opt) : IntMinimizeScript(opt), lh(*this, count) {  
    V = IntVarArray(*this, count*count);
    for (int i=0; i<V.size(); i++)
      V[i] = IntVar(*this, 0, 1);
    branch(*this, V, INT_VAR_NONE(), INT_VAL_MIN());   
  }

  MyScript(bool share, MyScript& H) : IntMinimizeScript(share, H), lh(*this, count) {
    V.update(*this, share, H.V);
    lh.update(*this, share, H.lh);
  }

  Space* copy(bool share) { return new MyScript(share, *this); }
  IntVar cost(void) const { return V[0]; }
  void print(std::ostream& os) const {}
};

int main(int argc, char* argv[]) {
  SizeOptions opt("MyScript");      
  IntMinimizeScript::run<MyScript,BAB,SizeOptions>(opt);
  return 0;
}
