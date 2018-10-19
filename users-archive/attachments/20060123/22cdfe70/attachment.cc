#include "int/tunneling.hh"

namespace Gecode {
	
  using namespace Int;

  void
  tunneling(Space* home, const IntVarArgs& x, const IntVarArgs& y, const IntVarArgs& z, std::set<int>* (*fptr)(const int&)) {
    if (home->failed()) return;
    ViewArray<IntView> xv(home,x);
    ViewArray<IntView> yv(home,y);
    ViewArray<IntView> zv(home,z);
    GECODE_ES_FAIL(home,Tunneling::Tunneling::post(home,xv,yv,zv,fptr));
  }

}

