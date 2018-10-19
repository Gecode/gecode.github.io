/*
 *  Authors:
 *    Christian Schulte <schulte@gecode.org>
 *
 *  Copyright:
 *    Christian Schulte, 2008-2013
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
#include <gecode/minimodel.hh>
#include <gecode/search.hh>

using namespace Gecode;

class SendMoreMoney : public Space {
protected:
  IntVarArray l;
public:
  SendMoreMoney(void) : l(*this, 1, 0, 9) {
    IntVar a(l[0]);
    rel(*this, a,  Gecode::IRT_EQ, 6);
    branch(*this, l, INT_VAR_SIZE_MIN(), INT_VAL_MIN());
  }
  
  
  SendMoreMoney(bool share, SendMoreMoney& s) : Space(share, s) {
    l.update(*this, share, s.l);
  }
  
  virtual Space* copy(bool share) {
    return new SendMoreMoney(share,*this);
  }
  
  void print(void) const {
    std::cout << l << std::endl;
  }
  
};

int main(int argc, char* argv[]) {
  SendMoreMoney* m = new SendMoreMoney;
  
  SendMoreMoney* m2 = new SendMoreMoney(true, *m);
  
  DFS<SendMoreMoney> e(m2);
  delete m2;
  delete m;
  
  
  while (SendMoreMoney* s = e.next()) {
    s->print(); delete s;
  }
  return 0;
}