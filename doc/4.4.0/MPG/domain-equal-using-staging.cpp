/*
 *  Authors:
 *    Christian Schulte <schulte@gecode.org>
 *
 *  Copyright:
 *    Christian Schulte, 2008-2015
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

class Equal : public BinaryPropagator<Int::IntView,Int::PC_INT_DOM> {
public:
  Equal(Home home, Int::IntView x0, Int::IntView x1) 
    : BinaryPropagator<Int::IntView,Int::PC_INT_DOM>(home,x0,x1) {}
  static ExecStatus post(Home home, 
                         Int::IntView x0, Int::IntView x1) {
    if (!same(x0,x1))
      (void) new (home) Equal(home,x0,x1);
    return ES_OK;
  }
  Equal(Space& home, bool share, Equal& p) 
    : BinaryPropagator<Int::IntView,Int::PC_INT_DOM>(home,share,p) {}
  virtual Propagator* copy(Space& home, bool share) {
    return new (home) Equal(home,share,*this);
  }
  virtual PropCost cost(const Space&, 
                        const ModEventDelta& med) const {
    if (Int::IntView::me(med) != Int::ME_INT_DOM)
      return PropCost::binary(PropCost::LO);
    else
      return PropCost::binary(PropCost::HI);
  }
  virtual ExecStatus propagate(Space& home, 
                               const ModEventDelta& med) {
    if (Int::IntView::me(med) != Int::ME_INT_DOM) {
      do { 
        GECODE_ME_CHECK(x0.gq(home,x1.min()));
        GECODE_ME_CHECK(x1.gq(home,x0.min()));
      } while (x0.min() != x1.min());
      do {
        GECODE_ME_CHECK(x0.lq(home,x1.max()));
        GECODE_ME_CHECK(x1.lq(home,x0.max()));
      } while (x0.max() != x1.max());
      if (x0.assigned() && x1.assigned())
        return home.ES_SUBSUMED(*this);
      if (x0.range() && x1.range())
        return ES_FIX;
      return home.ES_FIX_PARTIAL
        (*this,Int::IntView::med(Int::ME_INT_DOM));
    }
    Int::ViewRanges<Int::IntView> r0(x0);
    GECODE_ME_CHECK(x1.inter_r(home,r0,false));
    Int::ViewRanges<Int::IntView> r1(x1);
    GECODE_ME_CHECK(x0.narrow_r(home,r1,false));
    if (x0.assigned() && x1.assigned())
      return home.ES_SUBSUMED(*this);
    else
      return ES_FIX;
  }
};

void equal(Home home, IntVar x0, IntVar x1) {
  if (home.failed()) return;
  GECODE_ES_FAIL(Equal::post(home,x0,x1));
}
