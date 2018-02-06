/*
 *  Authors:
 *    Guido Tack <tack@gecode.org>
 *
 *  Copyright:
 *    Guido Tack, 2008-2012
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

#include <gecode/driver.hh>
#include <gecode/int.hh>
#include <gecode/minimodel.hh>
using namespace Gecode;

const char* names[] = 
  {"Betty","Chris","Donald","Fred","Gary",
   "Mary","Paul","Peter","Susan"};
enum {
  Betty, Chris, Donald, Fred, Gary,
  Mary, Paul, Peter, Susan
};
const int n = 9;
const int n_prefs = 17;
int spec[n_prefs][2] = {
  {Betty,Donald}, {Betty,Gary}, {Betty,Peter},
  {Chris,Gary}, {Chris,Susan},
  {Donald,Fred}, {Donald,Gary},
  {Fred,Betty}, {Fred,Gary},
  {Gary,Mary}, {Gary,Betty},
  {Mary,Betty}, {Mary,Susan},
  {Paul,Donald}, {Paul,Peter},
  {Peter,Susan}, {Peter,Paul}
};

class Photo : public MinimizeScript {
  IntVarArray pos;
  IntVar      violations;
public:
  Photo(const Options& opt)
    : pos(*this,n,0,n-1), violations(*this,0,n_prefs) {
    // constrain positions
    distinct(*this, pos, ICL_BND);
    // compute violations
    BoolVarArgs viol(n_prefs);
    for (int i=0; i<n_prefs; i++) {
      viol[i] = expr(*this, abs(pos[spec[i][0]]-pos[spec[i][1]]) > 1);
    }
    rel(*this, violations == sum(viol));
    // symmetry breaking
    rel(*this, pos[Betty] < pos[Chris]);
    branch(*this, pos, INT_VAR_NONE, INT_VAL_MIN);
  }
  virtual IntVar cost(void) const {
    return violations;
  }  
  Photo(bool share, Photo& p) : MinimizeScript(share,p) {
    pos.update(*this, share, p.pos);
    violations.update(*this, share, p.violations);
  }
  virtual Space* copy(bool share) {
    return new Photo(share,*this);
  }
  virtual void print(std::ostream& os) const {
    if (pos.assigned()) {
      os << "\tOrder: ";
      int order[n];
      for (int i=0; i<n; i++)
        order[pos[i].val()] = i;
      for (int i=0; i<n; i++)
        os << names[order[i]] << " ";
    } else {
      os << "\tPositions: " << pos;
    }
    os << std::endl << "\tViolations: " << violations << std::endl;
  }
};
int main(int argc, char* argv[]) {
  Options opt("Photo");
  opt.solutions(0);
  opt.parse(argc,argv);
  MinimizeScript::run<Photo,BAB,Options>(opt);
  return 0;
}
