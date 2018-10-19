#include "cspbranch.h"
#include "converter.h"

namespace CSPPLAN
{
  CSPBranch::CSPBranch(Gecode::Space* home, ViewIntArray& xv)
      : Gecode::Branching(home)
      , x(xv)
      , pos(-1)
      , val(-1)
    {
      //active_transitions = new bool[xv.size()];
      //for ( int i= 0 ; i < active_transitions.size(); ++i )
	//active_transitions[i] = false;
    }

  CSPBranch::CSPBranch(Gecode::Space* home, bool share, CSPBranch& branch)
      : Gecode::Branching(home, share, branch)
      , pos(branch.pos)
      , val(branch.val)
	// , active_transitions(branch.active_transitions)
    {
      x.update(home, share, branch.x);
    }

  bool CSPBranch::status(const Gecode::Space* home) const
  {
    init_act_trans_list();
    std::cout<<"act_trans_list size = " << active_transition_list->size() << std::endl;
    
    if ( active_transition_list->size() != 0 )
      return true;
    else
      return false;
  }

  void CSPBranch::init_act_trans_list() const
  {
    std::cout<<"Branching"<<std::endl;
    active_transition_list = new std::vector<int>();
    for (int i = 0 ; i < x.size(); ++i )
    {
      if (!x[i].assigned())
      {
	if (!x[i].in(CSPPLAN::NOT_IN_PLAN))
	  active_transition_list->push_back(i);
      }
      
    }
    
  }
  
  Gecode::BranchingDesc* CSPBranch::description(const Gecode::Space* home) const
  {
    return get_pos_val();
  }

  Gecode::PosValDesc<int,2>* CSPBranch::get_pos_val() const 
  {
    std::cout<<"Description"<<std::endl;
    int min_var = -1;
    int global_min_val = -1;
    
    int global_min = 1000;

    for ( int i = 0 ; i < active_transition_list->size(); ++i )
    {
      int local_min = 1000;
      int min_val = -1;
      Gecode::Int::ViewValues<Gecode::Int::IntView> values(x[(*active_transition_list)[i]]);
      while (values())
      {
	int val = values.val();
	if ( val != NOT_IN_PLAN && val != IN_PLAN )
	{
	  int domain_size = x[val].size();
	  if ( domain_size < local_min )
	  {
	    local_min = domain_size;
	    min_val = val;
	  }
	}
	++values;
      } 
      
      if ( local_min < global_min )
      {
	global_min = local_min;
	global_min_val = min_val;
	min_var = i;
      }
    }
    
    pos = min_var;
    val = global_min_val;
    std::cout << "var = "<< pos <<" , val = "<< val << std::endl;
    return new Gecode::PosValDesc<int,2>(this, pos, val);
    
  }

  Gecode::ExecStatus CSPBranch::commit(Gecode::Space* home, const Gecode::BranchingDesc* b, unsigned int a)
  {
    //std::cout << "Commit" << std::endl;
    const Gecode::PosValDesc<int,2>* desc = static_cast <const Gecode::PosValDesc<int,2>* > (b);
    
    std::cout << desc->pos()<<", " <<  desc->val() << ", a = " << a << std::endl ;

    
    if (a)
      return Gecode::me_failed(x[desc->pos()].nq(home, desc->val())) ? Gecode::ES_FAILED : Gecode::ES_OK;
    else
      return Gecode::me_failed(x[desc->pos()].eq(home, desc->val())) ? Gecode::ES_FAILED : Gecode::ES_OK;
  }

  Gecode::Actor* CSPBranch::copy(Gecode::Space* home, bool share)
  {
    return new (home) CSPBranch(home, share, *this);
  }

  void CSPBranch::post(Gecode::Space* home, ViewIntArray& xv)//::IntVarArgs x)
  {
    //ViewIntArray xv(home, x);
    (void) new (home) CSPBranch(home, xv);
  }

  
}
