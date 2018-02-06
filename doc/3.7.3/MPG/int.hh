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

#ifndef __MPG_INT_HH__
#define __MPG_INT_HH__
#include <iostream>
#include <sstream>
#include <climits>

#include <gecode/kernel.hh>

using Gecode::Advisor;
using Gecode::ConstView;
using Gecode::Delta;
using Gecode::DerivedView;
using Gecode::Exception;
using Gecode::ModEvent;
using Gecode::ModEventDelta;
using Gecode::PropCond;
using Gecode::Propagator;
using Gecode::Space;
using Gecode::VarArgArray;
using Gecode::VarArray;
using Gecode::VarImpVar;
using Gecode::VarImpView;


// exceptions
namespace MPG { namespace Int {

  class OutOfLimits : public Exception {
  public:
    OutOfLimits(const char* l)
      : Exception(l,"Number out of limits") {}
    };

  class VariableEmptyDomain : public Exception {
  public:
    VariableEmptyDomain(const char* l)
      : Exception(l,"Attempt to create variable with empty domain") {}
  };

}}

// variable implementation
namespace MPG { namespace Int {

  // limits
  namespace Limits {
    const int max = (INT_MAX / 2) - 1;
    const int min = -max;
  }
  // delta for advisors
  class IntDelta : public Delta {
  private:
    int l, u;
  public:
    IntDelta(int min, int max) : l(min), u(max) {}
    int min(void) const {
      return l;
    }
    int max(void) const {
      return u;
    }
  };
  
  class IntVarImp : public IntVarImpBase {
  protected:
    int l, u;
  public:
    IntVarImp(Space& home, int min, int max)
      : IntVarImpBase(home), l(min), u(max) {}
    // access operations
    int min(void) const {
      return l;
    }
    int max(void) const {
      return u;
    }
    // assignment test
    bool assigned(void) const {
      return l == u;
    }
    // modification operations
    ModEvent lq(Space& home, int n) {
      if (n >= u) return ME_INT_NONE;
      if (n < l) return ME_INT_FAILED;
      IntDelta d(n+1,u); u = n;
      return notify(home, assigned() ? ME_INT_VAL : ME_INT_MAX, d);
    }
    ModEvent gq(Space& home, int n) {
      if (n <= l) return ME_INT_NONE;
      if (n > u) return ME_INT_FAILED;
      IntDelta d(l,n-1); l = n;
      return notify(home, assigned() ? ME_INT_VAL : ME_INT_MIN, d);
    }
    // subscriptions
    void subscribe(Space& home, Propagator& p, PropCond pc, 
                   bool schedule=true) {
      IntVarImpBase::subscribe(home,p,pc,assigned(),schedule);
    }
    void subscribe(Space& home, Advisor& a) {
      IntVarImpBase::subscribe(home,a,assigned());
    }
    void cancel(Space& home, Propagator& p, PropCond pc) {
      IntVarImpBase::cancel(home,p,pc,assigned());
    }
    void cancel(Space& home, Advisor& a) {
      IntVarImpBase::cancel(home,a,assigned());
    }
    // copying
    IntVarImp(Space& home, bool share, IntVarImp& y)
      : IntVarImpBase(home,share,y), l(y.l), u(y.u) {}
    IntVarImp* copy(Space& home, bool share) {
      if (copied()) 
        return static_cast<IntVarImp*>(forward());
      else
        return new (home) IntVarImp(home,share,*this);
    }
    // delta information
    static int min(const Delta& d) {
      return static_cast<const IntDelta&>(d).min();
    }
    static int max(const Delta& d) {
      return static_cast<const IntDelta&>(d).max();
    }
  };

}}

// variable
namespace MPG {

  class IntVar : public VarImpVar<Int::IntVarImp> {
  protected:
    using VarImpVar<Int::IntVarImp>::x;
  public:
    IntVar(void) {}
    IntVar(const IntVar& y)
      : VarImpVar<Int::IntVarImp>(y.varimp()) {}
    // variable creation
    IntVar(Space& home, int min, int max)
      : VarImpVar<Int::IntVarImp>
          (new (home) Int::IntVarImp(home,min,max)) {
      if ((min < Int::Limits::min) || (max > Int::Limits::max))
        throw Int::OutOfLimits("IntVar::IntVar");
      if (min > max)
        throw Int::VariableEmptyDomain("IntVar::IntVar");
    }
    // access operations
    int min(void) const {
      return x->min();
    }
    int max(void) const {
      return x->max();
    }
  };

  template<class Char, class Traits>
  std::basic_ostream<Char,Traits>&
  operator <<(std::basic_ostream<Char,Traits>& os, const IntVar& x) {
    std::basic_ostringstream<Char,Traits> s;
    s.copyfmt(os); s.width(0);
    if (x.assigned())
      s << x.min();
    else
      s << '[' << x.min() << ".." << x.max() << ']';
    return os << s.str();
  }

}
// array traits
namespace MPG {
  class IntVarArgs; class IntVarArray;
}

namespace Gecode {

  template<>
  class ArrayTraits<Gecode::VarArray<MPG::IntVar> > {
  public:
    typedef MPG::IntVarArray  StorageType;
    typedef MPG::IntVar       ValueType;
    typedef MPG::IntVarArgs   ArgsType;
  };
  template<>
  class ArrayTraits<MPG::IntVarArray> {
  public:
    typedef MPG::IntVarArray  StorageType;
    typedef MPG::IntVar       ValueType;
    typedef MPG::IntVarArgs   ArgsType;
  };
  template<>
  class ArrayTraits<Gecode::VarArgArray<MPG::IntVar> > {
  public:
    typedef MPG::IntVarArgs   StorageType;
    typedef MPG::IntVar       ValueType;
    typedef MPG::IntVarArgs   ArgsType;
  };
  template<>
  class ArrayTraits<MPG::IntVarArgs> {
  public:
    typedef MPG::IntVarArgs  StorageType;
    typedef MPG::IntVar      ValueType;
    typedef MPG::IntVarArgs  ArgsType;
  };

}
// variable arrays
namespace MPG {

  class IntVarArgs : public VarArgArray<IntVar> {
  public:
    IntVarArgs(void) {}
    explicit IntVarArgs(int n) : VarArgArray<IntVar>(n) {}
    IntVarArgs(const IntVarArgs& a) : VarArgArray<IntVar>(a) {}
    IntVarArgs(const VarArray<IntVar>& a) : VarArgArray<IntVar>(a) {}
    IntVarArgs(Space& home, int n, int min, int max)
      : VarArgArray<IntVar>(n) {
      for (int i=0; i<n; i++)
        (*this)[i] = IntVar(home,min,max);
    }
  };

  class IntVarArray : public VarArray<IntVar> {
  public:
    IntVarArray(void) {}
    IntVarArray(const IntVarArray& a)
      : VarArray<IntVar>(a) {}
    IntVarArray(Space& home, int n, int min, int max)
      : VarArray<IntVar>(home,n) {
      for (int i=0; i<n; i++)
        (*this)[i] = IntVar(home,min,max);
    }
  };

}

// integer view
namespace MPG { namespace Int {

  class IntView : public VarImpView<IntVar> {
  protected:
    using VarImpView<IntVar>::x;
  public:
    IntView(void) {}
    IntView(const IntVar& y)
      : VarImpView<IntVar>(y.varimp()) {}
    IntView(IntVarImp* y)
      : VarImpView<IntVar>(y) {}
    // access operations
    int min(void) const {
      return x->min();
    }
    int max(void) const {
      return x->max();
    }
    // modification operations
    ModEvent lq(Space& home, int n) {
      return x->lq(home,n);
    }
    ModEvent gq(Space& home, int n) {
      return x->gq(home,n);
    }
    // delta information
    int min(const Delta& d) const {
      return IntVarImp::min(d);
    }
    int max(const Delta& d) const {
      return IntVarImp::max(d);
    }
  };

  template<class Char, class Traits>
  std::basic_ostream<Char,Traits>&
  operator<<(std::basic_ostream<Char,Traits>& os, const IntView& x) {
    std::basic_ostringstream<Char,Traits> s;
    s.copyfmt(os); s.width(0);
    if (x.assigned())
      s << x.min();
    else
      s << '[' << x.min() << ".." << x.max() << ']';
    return os << s.str();
  }

}}
// constant integer view
namespace MPG { namespace Int {

  class ConstIntView : public ConstView<IntView> {
  protected:
    int x;
  public:
    ConstIntView(void) : x(0) {}
    ConstIntView(int n) : x(n) {}

    int min(void) const {
      return x;
    }
    int max(void) const {
      return x;
    }
    ModEvent lq(Space& home, int n) {
      return (x <= n) ? ME_INT_NONE : ME_INT_FAILED;
    }
    ModEvent gq(Space& home, int n) {
      return (x >= n) ? ME_INT_NONE : ME_INT_FAILED;
    }
    // delta information
    int min(const Delta& d) const {
      GECODE_NEVER; return 0;
    }
    int max(const Delta& d) const {
      GECODE_NEVER; return 0;
    }
    // update during cloning
    void update(Space& home, bool share, ConstIntView& y) {
      ConstView<IntView>::update(home,share,y);
      x = y.x;
    }
  };
  // view tests
  inline bool same(const ConstIntView& x, const ConstIntView& y) {
    return x.min() == y.min();
  }
  inline bool before(const ConstIntView& x, const ConstIntView& y) {
    return x.min() < y.min();
  }

  template<class Char, class Traits>
  std::basic_ostream<Char,Traits>&
  operator <<(std::basic_ostream<Char,Traits>& os, const ConstIntView& x) {
    return os << x.min();
  }

}}
// minus view
namespace MPG { namespace Int {

  class MinusView : public DerivedView<IntView> {
  protected:
    using DerivedView<IntView>::x;
    // modification events and propagation conditions
    static ModEvent minusme(ModEvent me) {
      switch (me) {
      case ME_INT_MIN: return ME_INT_MAX;
      case ME_INT_MAX: return ME_INT_MIN;
      default: return me;
      }
    }
    static PropCond minuspc(PropCond pc) {
      switch (pc) {
      case PC_INT_MIN: return PC_INT_MAX;
      case PC_INT_MAX: return PC_INT_MIN;
      default: return pc;
      }
    }
  public:
    MinusView(void) {}
    explicit MinusView(const IntView& y) 
      : DerivedView<IntView>(y) {}
    // access operations
    int min(void) const {
      return -x.max();
    }
    int max(void) const {
      return -x.min();
    }
    // modification operations
    ModEvent lq(Space& home, int n) {
      return minusme(x.gq(home,-n));
    }
    ModEvent gq(Space& home, int n) {
      return minusme(x.lq(home,-n));
    }
    // support operations
    static void schedule(Space& home, Propagator& p, ModEvent me) {
      return IntView::schedule(home,p,minusme(me));
    }
    static ModEvent me(const ModEventDelta& med) {
      return minusme(IntView::me(med));
    }
    static ModEventDelta med(ModEvent me) {
      return IntView::med(minusme(me));
    }
    // subscriptions
    void subscribe(Space& home, Propagator& p, PropCond pc, 
                   bool schedule=true) {
      x.subscribe(home,p,minuspc(pc),schedule);
    }
    void subscribe(Space& home, Advisor& a) {
      x.subscribe(home,a);
    }
    void cancel(Space& home, Propagator& p, PropCond pc) {
      x.cancel(home,p,minuspc(pc));
    }
    void cancel(Space& home, Advisor& a) {
      x.cancel(home,a);
    }
    // delta information
    static ModEvent modevent(const Delta& d) {
      return minusme(IntView::modevent(d));
    }
    int min(const Delta& d) const {
      return -x.max(d);
    }
    int max(const Delta& d) const {
      return -x.min(d);
    }
  };

  template<class Char, class Traits>
  std::basic_ostream<Char,Traits>&
  operator <<(std::basic_ostream<Char,Traits>& os, const MinusView& x) {
    std::basic_ostringstream<Char,Traits> s;
    s.copyfmt(os); s.width(0);
    if (x.assigned())
      s << x.min();
    else
      s << '[' << x.min() << ".." << x.max() << ']';
    return os << s.str();
  }

}}
// offset view
namespace MPG { namespace Int {

  class OffsetView : public DerivedView<IntView> {
  protected:
    using DerivedView<IntView>::x;
    int c;
  public:
    OffsetView(void) {}
    OffsetView(const IntView& y, int d)
      : DerivedView<IntView>(y), c(d) {}

    int offset(void) const {
      return c;
    }
    int min(void) const {
      return x.min()+c;
    }
    int max(void) const {
      return x.max()+c;
    }

    ModEvent lq(Space& home, int n) {
      return x.lq(home,n-c);
    }
    ModEvent gq(Space& home, int n) {
      return x.gq(home,n-c);
    }

    int min(const Delta& d) const {
      return x.min(d)+c;
    }
    int max(const Delta& d) const {
      return x.max(d)+c;
    }

    // update during cloning
    void update(Space& home, bool share, OffsetView& y) {
      x.update(home,share,y.x);
      c=y.c;
    }
  };
  // view tests
  inline bool same(const OffsetView& x, const OffsetView& y) {
    return same(x.base(),y.base()) && (x.offset() == y.offset());
  }
  inline bool before(const OffsetView& x, const OffsetView& y) {
    return before(x.base(),y.base())
      || (same(x.base(),y.base()) && (x.offset() < y.offset()));
  }

  template<class Char, class Traits>
  std::basic_ostream<Char,Traits>&
  operator <<(std::basic_ostream<Char,Traits>& os, const OffsetView& x) {
    std::basic_ostringstream<Char,Traits> s;
    s.copyfmt(os); s.width(0);
    if (x.assigned())
      s << x.min();
    else
      s << '[' << x.min() << ".." << x.max() << ']';
    return os << s.str();
  }
  
}}

#endif
