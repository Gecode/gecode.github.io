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

#include <gecode/kernel.hh>

using namespace Gecode;

class SI : public SharedHandle {
protected:
  class SIO : public SharedHandle::Object {
  public:
    int data;
    SIO(int d) : data(d) {}
    SIO(const SIO& sio) : data(sio.data) {}
    virtual Object* copy(void) const {
      return new SIO(*this);
    }
    virtual ~SIO(void) {}
  };
public:
  SI(int d) : SharedHandle(new SIO(d)) {}
  int get(void) const {
    return static_cast<SIO*>(object())->data;
  }
  void set(int d) {
    static_cast<SIO*>(object())->data = d;
  }
  // some inherited members
  void update(Space& home, bool share, SharedHandle& sh) {
    SharedHandle::update(home,share,sh);
  }
  ~SI(void) {}
};
