#include "cspinstance.h"
#include "csppropagator.h"
#include "cspbranch.h"
namespace CSPPLAN
{
  //static const int CSPInstance::IN_PLAN = -1;
  //static const int CSPInstance::NOT_IN_PLAN = -2;
  //static const int CSPInstance::DUMMY_VAL = -3;
   
  int CSPInstance::start_action_index;
  int CSPInstance::finish_action_index;

 
  CSPInstance::CSPInstance(unsigned int n_transitions)
    : n_trans(n_transitions)
    , transitions() 
  {
    
    create_var_domains();
    
    Gecode::IntVarArgs arg_array(transitions);

    Gecode::ViewArray<Gecode::Int::IntView> trans_array(this, arg_array);
    
    CSPPropagator::post(this, trans_array);
       
    CSPBranch::post(this, trans_array);//arg_array);
    //branch(this, arg_array, Gecode::INT_VAR_DEGREE_MIN, Gecode::INT_VAL_MIN);
    
    
  }
  
  /*
  void CSPInstance::csp_branch()
  {
    Gecode::IntVarArgs arg_array(transitions);
    //Gecode::VarArgArray<Gecode::IntVar> arg_array(transitions);
    //CSPBranch::post(this, arg_array);
    //branch(this, arg_array, Gecode::INT_VAR_DEGREE_MIN, Gecode::INT_VAL_MIN);
    
  }
  */

  CSPInstance::CSPInstance(bool share, CSPInstance& csp)
    : Gecode::Space(share, csp)
    , n_trans(csp.n_trans)
  {
    transitions.update(this, share, csp.transitions);
  }

  Gecode::Space* CSPInstance::copy(bool share)
  //CSPInstance* CSPInstance::copy(bool share)
  {
    return new CSPInstance(share, *this);
  }

  void CSPInstance::create_var_domains()
  {
    for (int i= 0; i < n_trans; ++i )
    {
      Transition* t = Converter::transitions[i];
      t->create_csp_domain();
      //std::cout << i << " : " << *(t->dom) << std::endl;
      
      this->var = new Gecode::IntVar(this, *(t->dom));
      transitions.add(this, *var);
    }

    std::cout << "Total gecode transitions = " << transitions.size() << std::endl;
  }


  /**
  void CSPInstance::post_constraints()
  {
    Gecode::VarArgArray<Gecode::IntVar> arg_array(transitions);
    Gecode::ViewArray<Gecode::Int::IntView> trans_array(this, arg_array);
    CSPPropagator::post(this, trans_array);
    
    
    //   Testing for range
    
    
    Gecode::Int::ViewValues<Gecode::Int::IntView> range(trans_array[0]);

    while(range())
    {
      std::cout <<"Domain size = "<< trans_array[0].size()<<std::endl;
      std::cout <<"-Val-"<<range.val()<<std::endl;
	//"--Max-"<<range.max() << "--Width--"<<range.width()<<std::endl;
      ++range;
    }
    
  }
  **/

}
