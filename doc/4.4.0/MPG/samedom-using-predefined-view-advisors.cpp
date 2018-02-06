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

class SameDom : public Propagator {
protected:
  enum ToDo {
    INCLUDE, EXCLUDE, NOTHING
  };
  ToDo todo;
  Council<ViewAdvisor<Int::IntView> > c;
  IntSet d;
  static ModEvent include(Space& home, Int::IntView x, 
                          const IntSet& d) {
    IntSetRanges isr(d);
    return x.inter_r(home,isr,false);
  }
  static ModEvent exclude(Space& home, Int::IntView x, 
                          const IntSet& d) {
    IntSetRanges isr(d);
    return x.minus_r(home,isr,false);
  }
  static ToDo dom(Int::IntView x, const IntSet& d) {
    Int::ViewRanges<Int::IntView> vr(x);
    IntSetRanges isr(d);
    switch (Iter::Ranges::compare(vr,isr)) {
    case Iter::Ranges::CS_SUBSET:   return INCLUDE;
    case Iter::Ranges::CS_DISJOINT: return EXCLUDE;
    case Iter::Ranges::CS_NONE:     break;
    }
    return NOTHING;
  }
public:
  SameDom(Home home, const IntVarArgs& x, const IntSet& d0) 
    : Propagator(home), todo(NOTHING), c(home), d(d0) {
    for (int i=x.size(); i--; )
      (void) new (home) ViewAdvisor<Int::IntView>(home,*this,c,x[i]);
    home.notice(*this,AP_DISPOSE);
  }
  static ExecStatus post(Home home, 
                         const IntVarArgs& x, const IntSet& d) {
    for (int i=x.size(); i--; )
      switch (dom(x[i],d)) {
      case NOTHING: 
        break;
      case INCLUDE:
        for (int j=x.size(); j--; )
          GECODE_ME_CHECK(include(home,x[j],d));
        return ES_OK;
      case EXCLUDE:
        for (int j=x.size(); j--; )
          GECODE_ME_CHECK(exclude(home,x[j],d));
        return ES_OK;
      }
    (void) new (home) SameDom(home,x,d);
    return ES_OK;
  }
  virtual size_t dispose(Space& home) {
    home.ignore(*this,AP_DISPOSE);
    c.dispose(home);
    d.~IntSet();
    (void) Propagator::dispose(home);
    return sizeof(*this);
  }
  SameDom(Space& home, bool share, SameDom& p) 
    : Propagator(home,share,p), todo(NOTHING) {
    c.update(home,share,p.c);
    d.update(home,share,p.d);
  }
  virtual Propagator* copy(Space& home, bool share) {
    return new (home) SameDom(home,share,*this);
  }
  virtual PropCost cost(const Space&, const ModEventDelta&) const {
    return PropCost::unary(PropCost::HI);
  }
  virtual ExecStatus advise(Space&, Advisor& a, const Delta&) {
    if (todo != NOTHING)
      return ES_FIX;
    todo = dom(static_cast<ViewAdvisor<Int::IntView>&>(a).view(),d);
    return (todo == NOTHING) ? ES_FIX : ES_NOFIX;
  }
  virtual ExecStatus propagate(Space& home, const ModEventDelta&) {
    if (todo == INCLUDE)
      for (Advisors<ViewAdvisor<Int::IntView> > a(c); a(); ++a)
        GECODE_ME_CHECK(include(home,a.advisor().view(),d));
    else
      for (Advisors<ViewAdvisor<Int::IntView> > a(c); a(); ++a)
        GECODE_ME_CHECK(exclude(home,a.advisor().view(),d));
    return home.ES_SUBSUMED(*this);
  }
};

void samedom(Home home, const IntVarArgs& x, const IntSet& d) {
  if (home.failed()) return;
  GECODE_ES_FAIL(SameDom::post(home,x,d));
}
