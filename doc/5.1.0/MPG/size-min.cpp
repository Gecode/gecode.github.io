/*
 *  Authors:
 *    Christian Schulte <schulte@gecode.org>
 *
 *  Copyright:
 *    Christian Schulte, 2008-2017
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

class SizeMin : public Brancher {
protected:
  ViewArray<Int::IntView> x;
  mutable int start;
  class PosVal : public Choice {
  public:
    int pos; int val;
    PosVal(const SizeMin& b, int p, int v)
      : Choice(b,2), pos(p), val(v) {}
    virtual size_t size(void) const {
      return sizeof(*this);
    }
    virtual void archive(Archive& e) const {
      Choice::archive(e);
      e << pos << val;
    }
  };
public:
  SizeMin(Home home, ViewArray<Int::IntView>& x0)
    : Brancher(home), x(x0), start(0) {}
  static void post(Home home, ViewArray<Int::IntView>& x) {
    (void) new (home) SizeMin(home,x);
  }
  virtual size_t dispose(Space& home) {
    (void) Brancher::dispose(home);
    return sizeof(*this);
  }
  SizeMin(Space& home, bool share, SizeMin& b)
    : Brancher(home,share,b), start(b.start) {
    x.update(home,share,b.x);
  }
  virtual Brancher* copy(Space& home, bool share) {
    return new (home) SizeMin(home,share,*this);
  }
  virtual bool status(const Space& home) const {
    for (int i=start; i<x.size(); i++)
      if (!x[i].assigned()) {
        start = i; return true;
      }
    return false;
  }
  virtual Choice* choice(Space& home) {
    int p = start;
    unsigned int s = x[p].size();
    for (int i=start+1; i<x.size(); i++)
      if (!x[i].assigned() && (x[i].size() < s)) {
        p = i; s = x[p].size();
      }
    return new PosVal(*this,p,x[p].min());
  }
  virtual Choice* choice(const Space&, Archive& e) {
    int pos, val;
    e >> pos >> val;
    return new PosVal(*this, pos, val);
  }
  virtual ExecStatus commit(Space& home, 
                            const Choice& c,
                            unsigned int a) {
    const PosVal& pv = static_cast<const PosVal&>(c);
    int pos=pv.pos, val=pv.val;
    if (a == 0)
      return me_failed(x[pos].eq(home,val)) ? ES_FAILED : ES_OK;
    else
      return me_failed(x[pos].nq(home,val)) ? ES_FAILED : ES_OK;
  }
  virtual void print(const Space& home, const Choice& c,
                     unsigned int a,
                     std::ostream& o) const {
    const PosVal& pv = static_cast<const PosVal&>(c);
    int pos=pv.pos, val=pv.val;
    if (a == 0)
      o << "x[" << pos << "] = " << val;
    else
      o << "x[" << pos << "] != " << val;
  }
};

void sizemin(Home home, const IntVarArgs& x) {
  if (home.failed()) return;
  ViewArray<Int::IntView> y(home,x);
  SizeMin::post(home,y);
}
