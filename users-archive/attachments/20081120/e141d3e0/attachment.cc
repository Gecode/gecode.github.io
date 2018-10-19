
#include "gecode/kernel.hh"
#include "gecode/int.hh"
#include "gecode/minimodel.hh"
#include "gecode/search.hh"

typedef Gecode::ViewArray<Gecode::Int::BoolView> BoolViewArray;

typedef Gecode::BinaryPropagator
<BoolViewArray, Gecode::Int::PC_INT_VAL>
PropBaseType;

class ThePropagator : public PropBaseType {
 public:
  // constructor for posting
  ThePropagator(Gecode::Space* home,
		BoolViewArray& va0,
		BoolViewArray& va1)
    : PropBaseType(home, va0, va1) { };
  // constructor for cloning
  ThePropagator(Gecode::Space* home, bool share, ThePropagator& pp)
    : PropBaseType(home, share, pp) { };

  // copy of a propagator during cloning
  virtual Gecode::Actor* copy(Gecode::Space* home, bool share)
  {
    return new (home) ThePropagator(home, share, *this);
  };

  // preform propagation
  virtual Gecode::ExecStatus propagate
  (Gecode::Space* home, Gecode::ModEventDelta med);

  // Post the propagator
  static Gecode::ExecStatus post
  (Gecode::Space* home,
   const Gecode::BoolVarArray& bv0,
   const Gecode::BoolVarArray& bv1)
  {
    BoolViewArray va0(home, bv0.size());
    for (int k = 0; k < bv0.size(); k++)
      va0[k] = Gecode::Int::BoolView(bv0[k]);
    BoolViewArray va1(home, bv1.size());
    for (int k = 0; k < bv1.size(); k++)
      va1[k] = Gecode::Int::BoolView(bv1[k]);
    new (home) ThePropagator(home, va0, va1);
    return Gecode::ES_OK;
  };
};

Gecode::ExecStatus ThePropagator::propagate
(Gecode::Space* home, Gecode::ModEventDelta med)
{
  return Gecode::ES_FIX;
}

class TheSpace : public Gecode::Space
{
 protected:
  Gecode::BoolVarArray bv0;
  Gecode::BoolVarArray bv1;

 public:
  TheSpace(int n0, int n1);
  TheSpace(bool share, TheSpace& s);
  virtual Gecode::Space* copy(bool share);
};

TheSpace::TheSpace(int n0, int n1)
  : bv0(this, n0, 0, 1),
    bv1(this, n1, 0, 1)
{
  ThePropagator::post(this, bv0, bv1);
}

TheSpace::TheSpace(bool share, TheSpace& cc)
  : Gecode::Space(share, cc)
{
  bv0.update(this, share, cc.bv0);
  bv1.update(this, share, cc.bv1);
}

Gecode::Space* TheSpace::copy(bool share)
{
  return new TheSpace(share, *this);
}

int main(int argc, char** argv)
{
  TheSpace* cc = new TheSpace(10, 10);
  std::cout << cc->status() << std::endl;
}
