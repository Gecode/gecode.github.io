/*
 *  Authors:
 *    Christian Schulte <schulte@gecode.org>
 *
 *  Copyright:
 *    Christian Schulte, 2008-2012
 *
 *  Permission is hereby granted, free of charge, to any person obtaining
 *  a copy of this software, to deal in the software without restriction,
 *  including without limitation the rights to use, copy, modify, merge,
 *  publish, distribute, sublicense, and/or sell copies of the software,
 *  and to permit persons to whom the software is furnished to do so, subject
 *  to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be
 *  included in all copies or substantial portions of the software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 *  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 *  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 *  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 *  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 *  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 *  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

#include <gecode/int.hh>

using namespace Gecode;

// view selection
class SizeMin : public ViewSelBase<Int::IntView> {
protected:
  unsigned int size;
public:
  SizeMin(void) : size(0U) {}
  SizeMin(Space& home, const VarBranchOptions& vbo) 
    : ViewSelBase<Int::IntView>(home,vbo) {}
  ViewSelStatus init(Space& home, Int::IntView x) {
    size = x.size(); 
    return (size == 2) ? VSS_BEST : VSS_BETTER;
  }
  ViewSelStatus select(Space& home, Int::IntView x) {
    if (x.size() < size) {
      size = x.size(); 
      return (size == 2) ? VSS_BEST : VSS_BETTER;
    } else if (x.size() > size) {
      return VSS_WORSE;
    } else {
      return VSS_TIE;
    }
  }
};
// value selection
class ValMin : public ValSelBase<Int::IntView,int> {
public:
  ValMin(void) {}
  ValMin(Space& home, const ValBranchOptions& vbo)
    : ValSelBase<Int::IntView,int>(home,vbo) {}
  int val(Space& home, Int::IntView x) const {
    return x.min();
  }
  ModEvent tell(Space& home, unsigned int a, Int::IntView x, int n) {
    return (a == 0) ? x.eq(home,n) : x.gr(home,n);
  }
};
void sizemin(Home home, const IntVarArgs& x) {
  if (home.failed()) return;
  ViewArray<Int::IntView> y(home,x);
  SizeMin sm; ValMin vm;
  ViewValBrancher<SizeMin,ValMin>::post(home,y,sm,vm);
}
