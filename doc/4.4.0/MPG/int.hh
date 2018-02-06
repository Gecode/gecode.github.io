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
using Gecode::AFC;
using Gecode::Activity;
using Gecode::Home;
using Gecode::ViewArray;
using Gecode::Rnd;
using Gecode::VarBranch;
using Gecode::ValBranch;
using Gecode::BranchTbl;
using Gecode::VoidFunction;
using Gecode::MeritBase;
using Gecode::ViewSel;
using Gecode::ViewSelMaxTbl;
using Gecode::ViewSelMinTbl;
using Gecode::ViewSelMax;
using Gecode::ViewSelMin;
using Gecode::ViewSelNone;
using Gecode::ViewSelRnd;
using Gecode::MeritFunction;
using Gecode::MeritDegree;
using Gecode::MeritActivity;
using Gecode::ValSel;
using Gecode::ValCommit;
using Gecode::NGL;
using Gecode::ExecStatus;
using Gecode::ES_FAILED;
using Gecode::ES_OK;
using Gecode::me_failed;
using Gecode::ViewValNGL;
using Gecode::ValSelCommit;
using Gecode::ValSelCommitBase;
using Gecode::ValSelFunction;
using Gecode::ValCommitFunction;
using Gecode::ViewValBrancher;
using Gecode::TieBreak;
using Gecode::function_cast;
using Gecode::BrancherHandle;


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
  class UnknownBranching : public Exception {
  public:
    UnknownBranching(const char* l)
      : Exception(l,"Unknown branching (variable or value)") {}
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
    IntVar(Int::IntVarImp* y)
      : VarImpVar<Int::IntVarImp>(y) {}
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

// branching
// branch function types
namespace MPG {
  typedef bool   (*IntBranchFilter)(const Space& home, 
                                    IntVar x, int i);
  typedef void   (*IntVarValPrint) (const Space &home, 
                                    const BrancherHandle& bh,
                                    unsigned int a,
                                    IntVar x, int i, const int& n,
                                    std::ostream& o);
  typedef double (*IntBranchMerit) (const Space& home, 
                                    IntVar x, int i);
  typedef int    (*IntBranchVal)   (const Space& home, 
                                    IntVar x, int i);
  typedef void   (*IntBranchCommit)(Space& home, unsigned int a,
                                    IntVar x, int i, int n);
}
// branch traits
namespace Gecode {
  template<>
  class BranchTraits<MPG::IntVar> {
  public:
    typedef MPG::IntBranchFilter Filter;
    typedef MPG::IntBranchMerit Merit;
    typedef MPG::IntBranchVal Val;
    typedef int ValType;
    typedef MPG::IntBranchCommit Commit;
  };
}

// variable AFC
namespace MPG {
  class IntAFC : public AFC {
  public:
    IntAFC(void);
    IntAFC(const IntAFC& a);
    IntAFC& operator =(const IntAFC& a);
    IntAFC(Home home, const IntVarArgs& x, double d=1.0);
    void init(Home home, const IntVarArgs& x, double d=1.0);
  };
  inline
  IntAFC::IntAFC(void) {}
  inline
  IntAFC::IntAFC(const IntAFC& a)
    : AFC(a) {}
  inline IntAFC&
  IntAFC::operator =(const IntAFC& a) {
    return static_cast<IntAFC&>(AFC::operator =(a));
  }
  inline
  IntAFC::IntAFC(Home home, const IntVarArgs& x, double d) {
    AFC::init(home,x,d);
  }
  inline void
  IntAFC::init(Home home, const IntVarArgs& x, double d) {
    AFC::init(home,x,d);
  }
}

// variable activity
namespace MPG {
  class IntActivity : public Activity {
  public:
    IntActivity(void);
    IntActivity(const IntActivity& a);
    IntActivity& operator =(const IntActivity& a);
    IntActivity(Home home, const IntVarArgs& x, double d=1.0,
                IntBranchMerit bm=NULL);
    void init(Home home, const IntVarArgs& x, double d=1.0,
              IntBranchMerit bm=NULL);
  };
  inline
  IntActivity::IntActivity(void) {}
  inline
  IntActivity::IntActivity(const IntActivity& a)
    : Activity(a) {}
  inline IntActivity&
  IntActivity::operator =(const IntActivity& a) {
    return static_cast<IntActivity&>(Activity::operator =(a));
  }
  inline
  IntActivity::IntActivity(Home home, const IntVarArgs& x, double d,
                           IntBranchMerit bm) {
    ViewArray<Int::IntView> y(home,x);
    Activity::init(home,y,d,bm);
  }
  inline void
  IntActivity::init(Home home, const IntVarArgs& x, double d,
                    IntBranchMerit bm) {
    ViewArray<Int::IntView> y(home,x);
    Activity::init(home,y,d,bm);
  }
}

namespace MPG {
  // variable selection class
  class IntVarBranch : public VarBranch {
  public:
    enum Select {
      SEL_NONE,       SEL_RND,          SEL_MERIT_MAX,
      SEL_DEGREE_MAX, SEL_ACTIVITY_MAX, SEL_SIZE_MIN
    };
  protected:
    Select s;
  public:
    IntVarBranch(void) ;
    IntVarBranch(Rnd r);
    IntVarBranch(Select s0, BranchTbl t);
    IntVarBranch(Select s0, double d, BranchTbl t);
    IntVarBranch(Select s0, Activity a, BranchTbl t);
    IntVarBranch(Select s0, VoidFunction mf, BranchTbl t);
    Select select(void) const;
    // expand activity
    void expand(Home home, const IntVarArgs& x) {
      if ((select() == SEL_ACTIVITY_MAX) &&
          !activity().initialized())
        activity(IntActivity(home,x,decay()));
    }
  };
  inline
  IntVarBranch::IntVarBranch(void) 
    : VarBranch(NULL), s(SEL_NONE) {}
  inline
  IntVarBranch::IntVarBranch(Rnd r) 
    : VarBranch(r), s(SEL_RND) {}
  inline
  IntVarBranch::IntVarBranch(Select s0, BranchTbl t)
    : VarBranch(t), s(s0) {}
  inline
  IntVarBranch::IntVarBranch(Select s0, double d, BranchTbl t)
    : VarBranch(d,t), s(s0) {}
  inline
  IntVarBranch::IntVarBranch(Select s0, Activity a, BranchTbl t)
    : VarBranch(a,t), s(s0) {}
  inline
  IntVarBranch::IntVarBranch(Select s0, VoidFunction mf, BranchTbl t)
    : VarBranch(mf,t), s(s0) {}
  inline
  IntVarBranch::Select IntVarBranch::select(void) const {
    return s;
  }
  // variable selection functions
  IntVarBranch INT_VAR_NONE(void);
  IntVarBranch INT_VAR_RND(Rnd r);
  IntVarBranch INT_VAR_MERIT_MAX(IntBranchMerit bm, 
                                 BranchTbl tbl=NULL);
  IntVarBranch INT_VAR_DEGREE_MAX(BranchTbl tbl=NULL);
  IntVarBranch INT_VAR_ACTIVITY_MAX(double d=1.0, 
                                    BranchTbl tbl=NULL);     
  IntVarBranch INT_VAR_ACTIVITY_MAX(IntActivity a, 
                                    BranchTbl tbl=NULL);     
  IntVarBranch INT_VAR_SIZE_MIN(BranchTbl tbl=NULL);
  // variable selection function implementation
  inline IntVarBranch
  INT_VAR_MERIT_MAX(IntBranchMerit bm, BranchTbl tbl) {
    return IntVarBranch(IntVarBranch::SEL_MERIT_MAX,
                        function_cast<VoidFunction>(bm),tbl);
  }
  inline IntVarBranch
  INT_VAR_NONE(void) {
    return IntVarBranch(IntVarBranch::SEL_NONE,NULL);
  }
  inline IntVarBranch
  INT_VAR_RND(Rnd r) {
    return IntVarBranch(r);
  }
  inline IntVarBranch
  INT_VAR_DEGREE_MAX(BranchTbl tbl) {
    return IntVarBranch(IntVarBranch::SEL_DEGREE_MAX,tbl);
  }
  inline IntVarBranch
  INT_VAR_ACTIVITY_MAX(double d, BranchTbl tbl) {
    return IntVarBranch(IntVarBranch::SEL_ACTIVITY_MAX,d,tbl);
  }
  inline IntVarBranch
  INT_VAR_ACTIVITY_MAX(IntActivity a, BranchTbl tbl) {
    return IntVarBranch(IntVarBranch::SEL_ACTIVITY_MAX,a,tbl);
  }
  inline IntVarBranch
  INT_VAR_SIZE_MIN(BranchTbl tbl) {
    return IntVarBranch(IntVarBranch::SEL_SIZE_MIN,tbl);
  }
  // value selection functions
  class IntValBranch : public ValBranch {
  public:
    enum Select {
      SEL_MIN, SEL_RND, SEL_VAL_COMMIT
    };
  protected:
    Select s;
  public:
    IntValBranch(Select s0 = SEL_MIN)
      : s(s0) {}
    IntValBranch(Rnd r)
      : ValBranch(r), s(SEL_RND) {}
    IntValBranch(VoidFunction v, VoidFunction c)
      : ValBranch(v,c), s(SEL_VAL_COMMIT) {}
    Select select(void) const {
      return s;
    }
  };
  IntValBranch INT_VAL_MIN(void);
  IntValBranch INT_VAL_RND(Rnd r);
  IntValBranch INT_VAL(IntBranchVal v, IntBranchCommit c=NULL);
  inline IntValBranch
  INT_VAL_MIN(void) {
    return IntValBranch(IntValBranch::SEL_MIN);
  }
  inline IntValBranch
  INT_VAL_RND(Rnd r) {
    return IntValBranch(r);
  }
  inline IntValBranch
  INT_VAL(IntBranchVal v, IntBranchCommit c) {
    return IntValBranch(function_cast<VoidFunction>(v),
                        function_cast<VoidFunction>(c));
  }
}

namespace MPG { namespace Int {
  // view selection creation function
  // size merit class
  class MeritSize : public MeritBase<IntView,unsigned int> {
  public:
    MeritSize(Space& home, const VarBranch& vb)
      : MeritBase<IntView,unsigned int>(home,vb) {}
    MeritSize(Space& home, bool share, MeritSize& m)
      : MeritBase<IntView,unsigned int>(home,share,m) {}
    unsigned int operator ()(const Space& home, IntView x, int i) {
      return x.max() - x.min();
    }
  };
  inline ViewSel<IntView>*
  viewsel(Space& home, const IntVarBranch& ivb) {
    if (ivb.select() == IntVarBranch::SEL_NONE)
      return new (home) ViewSelNone<IntView>(home,ivb);
    if (ivb.select() == IntVarBranch::SEL_RND)
      return new (home) ViewSelRnd<IntView>(home,ivb);
    if (ivb.tbl() != NULL) {
      // view selection with tbl-function
      switch (ivb.select()) {
      case IntVarBranch::SEL_MERIT_MAX:
        return new (home) ViewSelMaxTbl<MeritFunction<IntView> >(home,ivb);
      case IntVarBranch::SEL_DEGREE_MAX:
        return new (home) ViewSelMaxTbl<MeritDegree<IntView> >(home,ivb);
      case IntVarBranch::SEL_ACTIVITY_MAX:
        return new (home) ViewSelMaxTbl<MeritActivity<IntView> >(home,ivb);
      case IntVarBranch::SEL_SIZE_MIN:
        return new (home) ViewSelMinTbl<MeritSize>(home,ivb);
      default: ;
      }
    } else {
      // view selection without tbl-function
      switch (ivb.select()) {
      case IntVarBranch::SEL_MERIT_MAX:
        return new (home) ViewSelMax<MeritFunction<IntView> >(home,ivb);
      case IntVarBranch::SEL_DEGREE_MAX:
        return new (home) ViewSelMax<MeritDegree<IntView> >(home,ivb);
      case IntVarBranch::SEL_ACTIVITY_MAX:
        return new (home) ViewSelMax<MeritActivity<IntView> >(home,ivb);
      case IntVarBranch::SEL_SIZE_MIN:
        return new (home) ViewSelMin<MeritSize>(home,ivb);
      default: ;
      }
    }
    throw UnknownBranching("Int::branch");
  }
  // value selection and commit creation function
  // value selection classes
  class ValSelMin : public ValSel<IntView,int> {
  public:
    ValSelMin(Space& home, const ValBranch& vb)
      : ValSel<IntView,int>(home,vb) {}
    ValSelMin(Space& home, bool share, ValSelMin& vs)
      : ValSel<IntView,int>(home,share,vs) {}
    int val(const Space& home, IntView x, int i) {
      return x.min();
    }
  };
  class ValSelRnd : public ValSel<IntView,int> {
  protected:
    Rnd r;
  public:
    ValSelRnd(Space& home, const ValBranch& vb)
      : ValSel<IntView,int>(home,vb), r(vb.rnd()) {}
    ValSelRnd(Space& home, bool share, ValSelRnd& vs)
      : ValSel<IntView,int>(home,share,vs) {
      r.update(home,share,vs.r);
    }
    int val(const Space& home, IntView x, int i) {
      return x.min() + r(x.max() - x.min());
    }
    bool notice(void) const {
      return true;
    }
    void dispose(Space& home) {
      r.~Rnd();
    }
  };
  // value commit class
  // no-good literal class
  class LqNGL : public ViewValNGL<IntView,int,PC_INT_BND> {
    using ViewValNGL<IntView,int,PC_INT_BND>::x;
    using ViewValNGL<IntView,int,PC_INT_BND>::n;
  public:
    LqNGL(Space& home, IntView x, int n);
    LqNGL(Space& home, bool share, LqNGL& ngl);
    virtual NGL* copy(Space& home, bool share);
    virtual NGL::Status status(const Space& home) const;
    virtual ExecStatus prune(Space& home);
  };
  inline
  LqNGL::LqNGL(Space& home, IntView x, int n)
    : ViewValNGL<IntView,int,PC_INT_BND>(home,x,n) {}
  inline
  LqNGL::LqNGL(Space& home, bool share, LqNGL& ngl)
    : ViewValNGL<IntView,int,PC_INT_BND>(home,share,ngl) {}
  inline NGL*
  LqNGL::copy(Space& home, bool share) {
    return new (home) LqNGL(home,share,*this);
  }
  inline NGL::Status
  LqNGL::status(const Space&) const {
    if (x.max() <= n)
      return NGL::SUBSUMED;
    else if (x.min() > n)
      return NGL::FAILED;
    else
      return NGL::NONE;
  }
  inline ExecStatus
  LqNGL::prune(Space& home) {
    return me_failed(x.gq(home,n+1)) ? ES_FAILED : ES_OK;
  }
  class ValCommitLq : public ValCommit<IntView,int> {
  public:
    ValCommitLq(Space& home, const ValBranch& vb)
      : ValCommit<IntView,int>(home,vb) {}
    ValCommitLq(Space& home, bool share, ValCommitLq& vc)
      : ValCommit<IntView,int>(home,share,vc) {}
    ModEvent commit(Space& home, unsigned int a, 
                    IntView x, int i, int n) {
      return (a == 0) ? x.lq(home,n) : x.gq(home,n+1);
    }
    void print(const Space&, unsigned int a, 
               IntView, int i, int n, 
               std::ostream& o) const {
      o << "x[" << i << "] " 
        << ((a == 0) ? "<=" : ">") << " " << n;
    }
    // no-good literal creation
    NGL* ngl(Space& home, unsigned int a, 
             IntView x, int n) const {
      if (a == 0)
        return new (home) LqNGL(home,x,n);
      else
        return NULL;
    }
  };
  inline ValSelCommitBase<IntView,int>* 
  valselcommit(Space& home, const IntValBranch& ivb) {
    switch (ivb.select()) {
    case IntValBranch::SEL_MIN:
      return new (home) 
        ValSelCommit<ValSelMin,ValCommitLq>(home,ivb);
    case IntValBranch::SEL_RND:
      return new (home) 
        ValSelCommit<ValSelRnd,ValCommitLq>(home,ivb);
    case IntValBranch::SEL_VAL_COMMIT:
     // user-defined value selection and commit functions
      if (ivb.commit() == NULL) {
        return new (home) 
          ValSelCommit<ValSelFunction<IntView>,
                       ValCommitLq>(home,ivb);
      } else {
        return new (home) 
          ValSelCommit<ValSelFunction<IntView>,
                       ValCommitFunction<IntView> >(home,ivb);
      }
    default:
      throw UnknownBranching("Int::branch");
    }
  }
}}

namespace MPG {
  // branch function
  inline BrancherHandle
  branch(Home home, const IntVarArgs& x,
         IntVarBranch vars, IntValBranch vals, 
         IntBranchFilter bf=NULL,
         IntVarValPrint vvp=NULL) {
    using namespace Int;
    if (home.failed()) return BrancherHandle();
    vars.expand(home,x);
    ViewArray<IntView> xv(home,x);
    ViewSel<IntView>* vs[1] = { 
      viewsel(home,vars) 
    };
    return ViewValBrancher<IntView,1,int,2>::post
      (home,xv,vs,valselcommit(home,vals),bf,vvp);
  }
  // branch function with tie-breaking
  inline BrancherHandle
  branch(Home home, const IntVarArgs& x,
         TieBreak<IntVarBranch> vars, IntValBranch vals,
         IntBranchFilter bf=NULL,
         IntVarValPrint vvp=NULL) {
    using namespace Int;
    if (home.failed()) return BrancherHandle();
    vars.a.expand(home,x);
    // normalizing tie-breaking
    if ((vars.a.select() == IntVarBranch::SEL_NONE) ||
        (vars.a.select() == IntVarBranch::SEL_RND))
      vars.b = INT_VAR_NONE();
    vars.b.expand(home,x);
    if ((vars.b.select() == IntVarBranch::SEL_NONE) ||
        (vars.b.select() == IntVarBranch::SEL_RND))
      vars.c = INT_VAR_NONE();
    vars.c.expand(home,x);
    if ((vars.c.select() == IntVarBranch::SEL_NONE) ||
        (vars.c.select() == IntVarBranch::SEL_RND))
      vars.d = INT_VAR_NONE();
    vars.d.expand(home,x);
    ViewArray<IntView> xv(home,x);
    if (vars.b.select() == IntVarBranch::SEL_NONE) {
      ViewSel<IntView>* vs[1] = { 
        viewsel(home,vars.a)
      };
      return ViewValBrancher<IntView,1,int,2>
        ::post(home,xv,vs,valselcommit(home,vals),bf,vvp);
    } else if (vars.c.select() == IntVarBranch::SEL_NONE) {
      ViewSel<IntView>* vs[2] = { 
        viewsel(home,vars.a), viewsel(home,vars.b)
      };
      return ViewValBrancher<IntView,2,int,2>
        ::post(home,xv,vs,valselcommit(home,vals),bf,vvp);
    } else if (vars.d.select() == IntVarBranch::SEL_NONE) {
      ViewSel<IntView>* vs[3] = { 
        viewsel(home,vars.a), viewsel(home,vars.b),
        viewsel(home,vars.c)
      };
      return ViewValBrancher<IntView,3,int,2>
        ::post(home,xv,vs,valselcommit(home,vals),bf,vvp);
    } else {
      ViewSel<IntView>* vs[4] = { 
        viewsel(home,vars.a), viewsel(home,vars.b),
        viewsel(home,vars.c), viewsel(home,vars.d)
      };         
      return ViewValBrancher<IntView,4,int,2>
        ::post(home,xv,vs,valselcommit(home,vals),bf,vvp);
    }
  }
}

#endif
