#include <gecode/driver.hh>
#include <gecode/int.hh>
#include <gecode/minimodel.hh>

using namespace Gecode;

class TestPropagator;

class TestPropagatorAdvisor : public Advisor 
{
public:
  TestPropagatorAdvisor(Space& home, Gecode::Propagator& propagator, Gecode::Council<TestPropagatorAdvisor>& council,Gecode::Int::IntView view)
    : Advisor(home,propagator,council), 
      MView(view)
  {
      MView.subscribe(home,propagator,Int::PC_INT_BND,false);
  }

  TestPropagatorAdvisor(Space& home, bool share, TestPropagatorAdvisor& that)
     : Gecode::Advisor(home,share,that)
  {
    MView.update(home,share,that.MView);
  }

  void dispose(Space& home, Gecode::Council<TestPropagatorAdvisor>& c)
  {
    MView.cancel(home,*this);

    Advisor::dispose(home,c);
  }
private:
  Int::IntView MView;
};

class TestPropagator : public Propagator 
{
public:
  
  
  static ExecStatus post(Space& home, Gecode::Int::IntView x, Gecode::Int::IntView y)
  {
    (void) new (home) TestPropagator(home,x,y);

    return ES_OK;
  }

  virtual ExecStatus advise(Space& home, Gecode::Advisor& a, const  Gecode::Delta& d)
  {
    //....
    return ES_FIX;
  }
  virtual Actor* copy(Space& home, bool share)
  {
    return new (home) TestPropagator(home,share,*this);
  }
  virtual PropCost cost(const Space& home,const Gecode::ModEventDelta& med) const
  {
    return PropCost::cubic(PropCost::HI, 2);
  }
  virtual size_t dispose(Space& home)
  {
    home.ignore(*this, Gecode::AP_DISPOSE);

    MCouncil.dispose(home);

    (void) Propagator::dispose(home);

    return sizeof(*this);
  }
  virtual ExecStatus propagate(Space& home, const ModEventDelta& med)
  {
    return ES_FIX;
  }
protected:
  TestPropagator(Space& home, Int::IntView x, Int::IntView y)
    : Gecode::Propagator(home),
      MCouncil(home)
  {
    (void) new (home) TestPropagatorAdvisor(home,*this,MCouncil,x);
    (void) new (home) TestPropagatorAdvisor(home,*this,MCouncil,y);

    home.notice(*this, Gecode::AP_DISPOSE);
  }

  TestPropagator(Space& home, bool share,TestPropagator& propagator)
    : Propagator(home,share,propagator)
  {
    MCouncil.update(home,share,MCouncil);
  }
  

  Council<TestPropagatorAdvisor> MCouncil;
};


class Test : public Script 
{
private:

  IntVar MX;
  IntVar MY;
public:
  Test(const SizeOptions& opt)
    : MX(*this,0,10),
      MY(*this,0,10)
  {
    Int::IntView vx(MX);
    Int::IntView vy(MY);

    TestPropagator::post(*this,vx,vy);
  }
   Test(bool share, Test& e)
    : Script(share, e) 
  {
    MX.update(*this, share, e.MX);
    MY.update(*this, share, e.MY);
  }
  virtual Space* copy(bool share) 
  {
    return new Test(share, *this);
  }
};

int main(int argc, char* argv[])
{
  SizeOptions opt("TestAdvisorDisposal");

  Script::run<Test,DFS,SizeOptions>(opt);
  
  return 0;
}