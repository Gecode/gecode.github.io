#include "csppropagator.h"
#include "converter.h"
namespace CSPPLAN
{
  unsigned int CSPPropagator::n_cycle_check = 0;
  unsigned int CSPPropagator::n_action_activation = 0;
  unsigned int CSPPropagator::n_unique = 0;
  unsigned int CSPPropagator::n_action_deactivation = 0;


  // constructor for posting
  CSPPropagator::CSPPropagator(Gecode::Space* home, ViewIntArray& arr)
  : Gecode::NaryPropagator< Gecode::Int::IntView, Gecode::Int::PC_INT_VAL>(home, arr)
  {
    
  }

  // constructor for cloning
  CSPPropagator::CSPPropagator(Gecode::Space* home, bool share, CSPPropagator& prop)
  : Gecode::NaryPropagator< Gecode::Int::IntView, Gecode::Int::PC_INT_VAL>(home, share, prop)
  , assigned_set(prop.assigned_set)
  , not_in_plan_act_set(prop.not_in_plan_act_set)
  , in_plan_act_set(prop.in_plan_act_set)
  {
    //std::cout << "Propagator cloned  " << assigned_set.size() << std::endl;
    //x.update(this, share, prop.x);
  }

  /**
  // constructor for rewriting 
  CSPPropagator::CSPPropagator(Gecode::Space* home, bool share, Gecode::Propagator& p, ViewIntArray& arry)
    : Gecode::NaryPropagator< Gecode::Int::IntView, Gecode::Int::PC_INT_VAL>(home, share, p, arry)
  {
    std::cout << "Propagator re-write " << std::endl;
  }
  */

  // copy method for cloning
  Gecode::Actor* CSPPropagator::copy(Gecode::Space* home, bool share)
  {
    return new (home) CSPPropagator(home, share, *this); // cloning constructor
  }

  //posting
  Gecode::ExecStatus CSPPropagator::post(Gecode::Space* home, ViewIntArray& arry)
  {
    //(void) new (home) CSPPropagator(home, arry);
    new (home) CSPPropagator(home, arry);
    return Gecode::ES_OK;
  }


  // propagator
  Gecode::ExecStatus CSPPropagator::propagate(Gecode::Space* home)
  {
    std::cout << "Propagating ........" << x.size() << "," << assigned_set.size()<< std::endl;
    
    int count = 0;
    
    //Converter::active_transition_list.clear();
    

    //for ( int i = 0; i < x.size(); ++i )
    for ( int i = 0; i < x.size(); ++i )
    {
      //std::cout << assigned_set.count(i) << std::endl;
      if ( assigned_set.count(i) == 0 )//!is_checked(i) )
      {
	//if ( x[i].assigned() )
	if ( x[i].assigned() )
	{ 
	  std::cout << "Assignment : " << i  << " = " << x[i].val() << std::endl;
	  
	  
	  int trans_var_index = i;
	  int act_var_index = Converter::transition_action[trans_var_index];

	  assigned_set.insert(trans_var_index);

	  if ( x[i].val() >= 0 )
	  {
	    	      
	    int trans_val_index = x[i].val();
	    
	    int act_val_index = Converter::transition_action[trans_val_index];
	    
	    if ( not_in_plan_act_set.count( act_val_index ) != 0 || not_in_plan_act_set.count( act_var_index ) != 0 )
	      return Gecode::ES_FAILED;

	    //action_graph[act_val_index].insert(act_var_index);
	    
	    //std::cout << "For Assignment : " << trans_var_index << " = " << trans_val_index << "[" << act_var_index << " <- " << act_val_index << "]" << std::endl;

	    
	    if ( post_cycle_check_constraint(home,trans_var_index,trans_val_index,act_var_index,act_val_index)  )
	    {
	      if ( post_action_activation_constraint(home, act_var_index, act_val_index, trans_var_index) )
	      {
		if ( post_unique_supp_constraint(home, trans_var_index, trans_val_index) )
		{
		  //print_current_assignments();
		  //continue;  
		  //break;
		  //action_graph[act_val_index].insert(act_var_index);
		}
		else
		{
		  //std::cout << "Failed[unique]" << std::endl;
		  return Gecode::ES_FAILED;
		}
	      }
	      else
	      {
		//std::cout << "Failed[action_activation]" << std::endl;
		return Gecode::ES_FAILED;
	      }
	    }
	    else
	    {
	      //std::cout << "Failed[cycle_check]" << std::endl;
	      return Gecode::ES_FAILED;
	    }
	  }
	  else if (x[i].val() == NOT_IN_PLAN )
	  {
	    
	    // do something this means transition not in plan
	    if (post_action_deactivation_constraint(home, act_var_index) )
	    {
	      //print_current_assignments();
	      //continue;
	      //break;
	            
	    }
	    else
	    {
	      //std::cout << "Failed[action_deactivation]" << std::endl;
	      return Gecode::ES_FAILED;
	    }
	  }

	}
      }
      else
      {
	if (!x[i].in(NOT_IN_PLAN) )
	{
	  Converter::active_transition_list.insert(i) ;
	}
      }
      
    }
    //std::cout << "End Propagator " << std::endl;
    return Gecode::ES_OK;

  }

  bool CSPPropagator::is_exists(int val, std::vector<int>& vlist)
  {
    std::vector<int>::iterator itr = vlist.begin();
    for ( ; itr != vlist.end(); itr++ )
    {
      if ( *itr == val )
	return true;
    }
    
    return false;

  }
 
  
  bool CSPPropagator::post_cycle_check_constraint(Gecode::Space* home, 
						  int trans_var_index, int trans_val_index,
						  int act_var_index, int act_val_index)
  {
    //std::cout << "Posting Cycle Check....." << std::endl;

    supporting_trans_set = new std::set<int>();
    supported_trans_set  = new std::set<int>();


    std::vector<int> supporting_act;// = new std::list<int>();
    std::vector<int> supported_act;//  = new std::list<int>();


    supporting_act.insert(supporting_act.end(), act_val_index);
    construct_supporting_set(supporting_act);
    
    //std::cout<<"Supporting transition set " ;//<< std::endl;
    //print_set(*supporting_trans_set);
    

    supported_act.insert(supported_act.end(), act_var_index);
    construct_supported_set(supported_act);
 
    //std::cout<<"Supported transition set ";// << std::endl;
    //print_set(*supported_trans_set);
    
    //std::cout << "Supporting transition set size: " << supporting_trans_set->size() << std::endl;
    //std::cout << "Supported transition set size: " << supported_trans_set->size() << std::endl;


    std::set<int>::iterator supporting_itr = supporting_trans_set->begin();
    //for ( ; supporting_itr != supporting_trans_set->end(); supporting_itr++ )
    while ( supporting_itr != supporting_trans_set->end() )
    {
      //int supporting_trans = *supporting_itr;

      //std::cout << "For supporting transition "<< *supporting_itr << std::endl;
      Gecode::Int::IntView supporting_trans = x[*supporting_itr];
      std::set<int>::iterator supported_itr = supported_trans_set->begin();
      //for (; supported_itr != supported_trans_set->end(); supported_itr++ )
      while ( supported_itr != supported_trans_set->end() )
      {
	int supported_trans = *supported_itr;
	
	CSPPropagator::n_cycle_check++;
	//std::cout <<"Setting "<< *supporting_itr << " != " << supported_trans << std::endl;
	if ( Gecode::me_failed( supporting_trans.nq(home, supported_trans) ) )
	{
	  //std::cout <<"Failed "<< *supporting_itr << " != " << supported_trans << std::endl;
	  return false;
	}
	  
	supported_itr++;
      }

      supporting_itr++;
    }
    
    //delete supporting_act_set;
    //delete supported_act_set;

    

    
    return true;

  }
  

  void CSPPropagator::print_list(std::vector<int>& l)
  {
    std::cout << "{";
    for( std::vector<int>::iterator itr1 = l.begin(); itr1 != l.end(); itr1++ )
    {
      std::cout << *itr1 << ", ";
    }
    std::cout <<  "}" << std::endl;
  }


  void CSPPropagator::print_set(std::set<int>& l)
  {
    std::cout << "{";
    for( std::set<int>::iterator itr1 = l.begin(); itr1 != l.end(); itr1++ )
    {
      std::cout << *itr1 << ", " ;
    }
    std::cout << " }" << std::endl;
  }

  void CSPPropagator::print_current_assignments()
  {
    std::cout << "Current Assignments {";
    std::set<int>::iterator itr = assigned_set.begin();
    while ( itr != assigned_set.end() )
    {
      std::cout << *itr << "=" << x[*itr].val() << ", ";
      itr++;
    }
    std::cout << "}" << std::endl;

    std::cout << "Not_in_plan_act {";
    itr = not_in_plan_act_set.begin();
    while ( itr != not_in_plan_act_set.end() )
    {
      std::cout << *itr << ", ";
      itr++;
    }
    std::cout << "}" << std::endl;

    std::cout << "In_plan_act {";
    itr = in_plan_act_set.begin();
    while ( itr != in_plan_act_set.end() )
    {
      std::cout << *itr << ", ";
      itr++;
    }
    std::cout << "}" << std::endl;

    
  }

  void CSPPropagator::construct_supporting_set(std::vector<int>& supporting_act)
  {
    //std::cout << "Creating supporitng set" << std::endl;
    int length = 0;

    
    while (length < supporting_act.size() )
    {
      int act_index = supporting_act[length];
      //std::vector<int> trans_caused = Converter::action_transitions_map[act_index];
      std::set<int> trans_caused = Converter::action_transitions_map[act_index];
      
      std::set<int>::iterator rel_trans_itr = trans_caused.begin();
    
      while ( rel_trans_itr != trans_caused.end() )
      {
	Gecode::Int::IntView trans = x[*rel_trans_itr];//trans_caused[i]];
	if ( trans.assigned() )
	{
	  int val_index = trans.val();
	  if ( val_index >= 0 )
	  {
	    int act_val_index = Converter::transition_action[val_index];
	    if ( !is_exists(act_val_index, supporting_act) )
	      {
		//std::cout << "adding action " << act_val_index  << std::endl;
		//print_list(supporting_act);
		
		supporting_act.push_back(act_val_index);
	      }

	  }
	  
	}
	else
	{
	  supporting_trans_set->insert(*rel_trans_itr);
	}
	
	rel_trans_itr++;
      }
      
      length++;
    }
    //std::cout<<"Supporting action set " << std::endl;
    //print_list(supporting_act);
  }


  void CSPPropagator::construct_supported_set(std::vector<int>& supported_act)
  {
    //std::cout << "Creating supported set " << std::endl;
    bool used_as_value = false;
    int length = 0;
    //std::list<int>::iterator itr = supported_act.begin();
    
    while( length < supported_act.size() )
    {
      int act_index = supported_act[length];
      
      //std::vector<int> caused_trans = Converter::action_transitions_map[act_index];
      std::set<int> trans_caused = Converter::action_transitions_map[act_index];

      std::set<int>::iterator rel_trans_itr = trans_caused.begin();

      while ( rel_trans_itr != trans_caused.end() )
      {
	used_as_value = false;
	
	std::set<int> supports_to = Converter::transition_supports_to_map[*rel_trans_itr];
	
	std::set<int>::iterator itr_sup = supports_to.begin();
      
	while( itr_sup != supports_to.end() )
	{
	  int var_index = *itr_sup;
	  if ( x[var_index].assigned() )
	  {
	    int trans_val = x[var_index].val();
	    if ( trans_val == *rel_trans_itr )
	    {
	      used_as_value = true;
	      int act_var_index = Converter::transition_action[var_index];
	      if (!is_exists(act_var_index, supported_act ))
	      {
	        //std::cout << "adding action " << act_var_index  << std::endl;
		//print_list(supported_act);
		supported_act.push_back(act_var_index);
		break;
	      }
	      
	    }
	  }
	  itr_sup++;
	}
	
	/**
	for ( int i = 0; i< x.size(); i++ )
	{
	  if (x[i].assigned() )
	  {
	    if (x[i].val() == *rel_trans_itr )
	    {
	      used_as_value = true;
	      int act_var_index = Converter::transition_action[i];
	      if ( !is_exists(act_var_index, supported_act))
	      {
		std::cout << "adding @ " << act_var_index  << std::endl;
		print_list(supported_act);
		supported_act.push_back(act_var_index);
		break;
	      }
	    }
	  }
	}
        */
        
	//if ( !used_as_value )
	//{
	  supported_trans_set->insert(*rel_trans_itr);
	  //}
		
	rel_trans_itr++;
	
      }

      length++;
    }
    //std::cout<<"Supported action set " << std::endl;
    //print_list(supported_act);
  }
  
  

  bool CSPPropagator::post_action_activation_constraint(Gecode::Space* home, int act_var_index, int act_val_index, int trans_var_index)
  {
    //std::cout << "Action Activation..."<< act_var_index << " and " << act_val_index << std::endl;
    //std::vector<int> trans_vars = Converter::action_transitions_map[act_var_index];

    std::set<int>::iterator itr;
    CSPPropagator::n_action_activation++;

    if ( in_plan_act_set.count(act_var_index) == 0 )
    {
      in_plan_act_set.insert(act_var_index);
      std::set<int> trans_vars = Converter::action_transitions_map[act_var_index];
    
      itr = trans_vars.begin();
      
      while ( itr != trans_vars.end() )
      {
	if ( *itr != trans_var_index)
	{
	  Gecode::Int::IntView trans = x[*itr];//trans_vars[i]];
	  //std::cout << "Setting " << *itr << "!= NOT_IN_PLAN" << std::endl;
	  if ( Gecode::me_failed( trans.nq(home, NOT_IN_PLAN) ) )
	  {
	    //std::cout << "Failed to set " << *itr << "!= NOT_IN_PLAN" << std::endl;
	    //std::cout << "Reason " << *itr << "= " << x[*itr].val() << std::endl;
	    return false;
	  }
	}
	itr++;
      }
    }

    if ( in_plan_act_set.count(act_val_index) == 0 )
    {
      in_plan_act_set.insert(act_val_index);
      //std::vector<int> trans_vals = Converter::action_transitions_map[act_val_index];
      std::set<int> trans_vals = Converter::action_transitions_map[act_val_index];
      
      itr = trans_vals.begin();
     
      while ( itr != trans_vals.end() )
      {
	Gecode::Int::IntView trans = x[*itr];//trans_vals[i]];
	//std::cout << "Setting " << *itr << "!= NOT_IN_PLAN" << std::endl;
	if ( Gecode::me_failed( trans.nq(home, NOT_IN_PLAN)) )
        {
	  //std::cout << "Failed to set " << *itr << "!= NOT_IN_PLAN" << std::endl;
	  //std::cout << "Reason " << *itr << "= " << x[*itr].val() << std::endl;
	  return false;
	}
	itr++;
      }
    }
    
    return true;
  }


  bool CSPPropagator::post_action_deactivation_constraint(Gecode::Space* home, int act_index)
  {
    //std::cout<< "Deactivation Constraints...A[ "<< act_index << "]"<< std::endl;

    if ( not_in_plan_act_set.count(act_index) != 0 )
      return true;
    else
      not_in_plan_act_set.insert(act_index);

    //std::vector<int> trans_vars = Converter::action_transitions_map[act_index];
    std::set<int> trans_vars = Converter::action_transitions_map[act_index];
    
    CSPPropagator::n_action_deactivation++;
    
    std::set<int>::iterator itr = trans_vars.begin();

   
    while ( itr != trans_vars.end() )
    {
      Gecode::Int::IntView trans = x[*itr];//trans_vars[i]];
      //std::cout << "Setting " << *itr << " == NOT_IN_PLAN" << std::endl;

      //if ( x[*itr].assigned() )
	//std::cout << "Assigned to " << x[*itr].val() << std::endl;
      //else
	//std::cout << "Not assigned " << std::endl;

      if ( Gecode::me_failed( trans.eq(home, NOT_IN_PLAN)) )
      {
	//std::cout << "Failed to set " << *itr << "== NOT_IN_PLAN" << std::endl;
	return false;
      }
      
      /* Removing this transition from all other possible domains */
      std::set<int> supports = Converter::transition_supports_to_map[*itr];
      std::set<int>::iterator itr_sup = supports.begin();
   
      for (; itr_sup != supports.end(); itr_sup++ )
      {
	//std::cerr << "\nSupport [" << *itr << "]";
	//std::cerr << x[*itr] << std::endl;
	Gecode::Int::IntView sup_trans = x[*itr_sup];
	if (!trans.assigned())
	{
	  //CSPPropagator::n_unique++;
	  //std::cout << "Setting " << *itr_sup << " != " <<  *itr << std::endl;
	  if ( Gecode::me_failed( sup_trans.nq(home, *itr) ) )
	  {
	    // std::cout << "Failed to set " << *itr_sup << "!= "<< *itr << std::endl;
	      return false;
	    }
	}
      }
    
    /*--------------- end ---------------------------- */
      itr++;
    }

    return true;
    
  }

  bool CSPPropagator::post_unique_supp_constraint(Gecode::Space* home, int trans_var_index, int trans_val_index)
  {
    //std::cout << "Unique constraint ....." << trans_val_index << std::endl;
    std::set<int> supports = Converter::transition_supports_to_map[trans_val_index];
    
    std::set<int>::iterator itr = supports.begin();
    /*
    for (; itr != supports.end(); itr++ )
    {
      std::cerr << "\nSupport [" << *itr << "]";
    }
    itr = supports.begin();
    */
    for (; itr != supports.end(); itr++ )
    {
      //std::cerr << "\nSupport [" << *itr << "]";
      //std::cerr << x[*itr] << std::endl;
      Gecode::Int::IntView trans = x[*itr];
      if (!trans.assigned())
      {
	
	if ( trans.in(trans_val_index) )
	{
	  CSPPropagator::n_unique++;
 	  //std::cout << "Setting " << *itr << "!=" <<  trans_val_index << std::endl;
	  if ( Gecode::me_failed( trans.nq(home, trans_val_index) ) )
	  {
	    //std::cout << "Failed to set " << *itr << "!= "<< trans_val_index << std::endl;
	    return false;
	  }
	}
      }
    }
    
    return true;
  }

  




}
