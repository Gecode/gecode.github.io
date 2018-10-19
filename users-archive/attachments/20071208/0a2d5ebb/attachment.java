package CSPEncoding;

import static org.gecode.Gecode.*;
import static org.gecode.GecodeEnumConstants.*;

import java.util.*;
import java.util.Iterator;

import org.gecode.*;

import Utils.*;
import SASEncoding.*;

public class CSPConstraintsPropagator<IV extends IntView> extends NaryPropagator<IV> 
{
	int currentSupportedTransition;
	int currentSupportingTransition;
	
	ArrayList<Integer> supportedTransitions ; 
	ArrayList<Integer> supportingTransitions; 
	
	int transitionCount;
	ArrayList<Integer> checked;
	    
	public CSPConstraintsPropagator(Space home, ViewArray<IV> arr)
	{
		super(home, arr, PC_INT_VAL);
		transitionCount = iv.size() -1;
		checked= new ArrayList<Integer>();
		
	}
	
	//copy
	public CSPConstraintsPropagator(Space home, Boolean share, CSPConstraintsPropagator<IV> t)
	{
		super(home, share, t);
		//Utils.debug("Copying propagator......"+ t.checked.size());
		checked= new ArrayList<Integer>();
		transitionCount = t.transitionCount;
		Iterator<Integer> itr = t.checked.iterator();
		while ( itr.hasNext() )
		{
			checked.add(itr.next());
		}
		
	}
	
	//cost
	public PropCost cost()
	{
		return PC_LINEAR_HI;
	}
	
	//propagate
	/**
	 * Propagates three constraints in order. If the transition is assigned to be in the plan, 
	 * that is other values except -1, it does the following.
	 * First it calls the cycle check propagator, to
	 * ensure that there is no possible cycles. Then it calls the transition activation
	 * constraints and at last it update the other non-assigned transitions' domains.
	 * If the transition is assigned to -1, that means the transition is not part of the plan,
	 * it calls the transition de-activation constraints.
	 */
	public ExecStatus propagate(Space home)
	{
		
		//PrintStat.transitionActCount++;
		
		//Utils.debug("Propagating ........");
		
    	for ( int j = 0; j <= transitionCount; ++j )
    	{
    		if ( !checked.contains( new Integer(j) ) )
    		{
    			
    			//if the transiton is assigned i.e. has one enabling transition, then both transitions effects will be activated
        		IntVarView trans = (IntVarView)iv.get(j); //transition
        		if ( trans.assigned() )
        		{
        			//add the transition in the checked list
	    			checked.add( new Integer(j) );
	    			
	    			
        			if ( trans.val() >= 0 )
        			{
        				//Utils.debug("For Current Assignment: "+ j +" = "+  trans.val());
        				
        				
        				if ( cycleCheckConstraint(home, j, trans.val()))
    	    			{
    	    				if ( transitionActivationConstraint(home, j, trans, trans.val()))
    	    				{
    	    					if ( !updateDomains(home, trans.val()))
    	    					{
    	    						//Utils.debug("Update - FAILED");
    	    						//CSPOrderBasedEnc2.pending = new Stack<Integer>();
    	        					return ES_FAILED;
    	    					}
    	    				}
    	    				else
    	    				{
    	    					//Utils.debug("Activation - FAILED");
    	    					//CSPOrderBasedEnc2.pending = new Stack<Integer>();
            					return ES_FAILED;
    	    				}
    	    			}
    	    			else
    	    			{
    	    				//Utils.debug("Cycle - FAILED");
    	    				//CSPOrderBasedEnc2.pending = new Stack<Integer>();
        					return ES_FAILED;
    	    			}
        			}
        			else if ( trans.val() == -1 )
        			{
        				if ( !transitionDeactivationConstraint(home, j))
        				{
        					//Utils.debug("De-activation-FAILED");
        					//CSPOrderBasedEnc2.pending = new Stack<Integer>();
        					return ES_FAILED;
        				}
        					
        			}
        			
        		}
        	}
    	}
    	//Utils.debug("End Propagating ........");
    	
    	return ES_NOFIX;
	}
	
	/**
	 * This propagates the transition de-activation constraints. If one transitions is assigned -1, i.e. it is
	 * not in the plan, then the action that causes the transition should not be in the plan. In effect all the 
	 * other transitions caused by the action are also set to -1. 
	 * Since these transitions are not part of the plan, it should be deleted from the other transitions' domains.
	 * 
	 * @param home
	 * @param transIndx
	 * @return
	 */
	private boolean transitionDeactivationConstraint(Space home, int transIndx)
	{
		//Utils.debug("For Current Assignment: "+ transIndx +" = "+  -1);
		
		//action that caused this transition , this action should not be in the plan
		int varActionIdx = SASProblem.transitionCausedBy[transIndx];
				
		//All the transitions caused by the action
		int[] varActTransIdx = (int[]) SASProblem.actionCaused.get(varActionIdx);
		
		for ( int k = 0; k < varActTransIdx.length; ++k)
		{
			if (varActTransIdx[k] != transIndx )// if it is not the same transition
			{
				checked.add( new Integer(varActTransIdx[k]) );
				// transition should not be in the plan, since the action is not in the plan
				if (iv.get(varActTransIdx[k]).eq(home, CSPOrderBasedEnc2.NOT_IN_PLAN).failed())
				{
					if (iv.get(varActTransIdx[k]).assigned())
						Utils.debug( "value = " + iv.get(varActTransIdx[k]).val());
					//Utils.debug("Failed to set (-1) "+ varActTransIdx[k] + " = " + -1);
					//System.exit(1);
					return false;
				}
				
			}
			
		}
		
		
		return true;
	}
	
		
	/**
	 * Since our assumption is every transition should occur atmost once, then if a transition
	 * is assigned to another transition, then no other transition can have the transition as its value.
	 * This methods delete the value-transition from other non-assigned transitions' domains.
	 * 
	 * @param home
	 * @param val
	 */
	private boolean updateDomains(Space home, int val)
	{
		//removing assigned value from other domains, since one transition can appears atmost once
		for ( int k = 0; k <= transitionCount ; ++k)
    	{
			IntVarView trans = (IntVarView)iv.get(k); //transition
	    	if ( !trans.assigned()) // if not assigned
	    	{
	    		if ( trans.in(val)) // if its domain contains the value
	    		{
	    			
	    			if (iv.get(k).nq(home, val).failed())
	    				return false; //remove it
	    			//Utils.debug("removed val " + val + " from "+ k);
	    		}
	    	}
    	}
		return true;
    	
	}
	
	/**
	 * Implements Transition Activation constraints. When a transition is assigned, then the 
	 * action that caused the transition and the action that caused its value, both should be
	 * in the plan. In effect all the transitions caused by these two actions should be in the 
	 * plan as well. This procedure remove the -1 from those related transitions' domains.
	 * 
	 * @param home
	 * @param transIndx
	 * @param trans
	 * @param val
	 * @return
	 */
	private boolean transitionActivationConstraint(Space home, int transIndx, IntVarView trans, int val)
	{
		PrintStat.transitionActCount++;
		// the action index that caused the transition ( variable )
		int varActionIdx = SASProblem.transitionCausedBy[transIndx];
		// the action index that caused the value of the transition
		int valActionIdx = SASProblem.transitionCausedBy[val];
		
		// All the transitions caused by the varActionIdx
		int[] varActTransIdx = (int[]) SASProblem.actionCaused.get(varActionIdx);
		
		for ( int k = 0; k < varActTransIdx.length; ++k)
		{
			if (varActTransIdx[k] != transIndx ) // if it is not the same transition
			{
				
				
				// then all other transitions should be in the plan, since the action is in the plan
				if (iv.get(varActTransIdx[k]).nq(home, CSPOrderBasedEnc2.NOT_IN_PLAN).failed())
				{
					//Utils.debug("Failed to set (var) "+ varActTransIdx[k] + "( "+ ((IntVarView)iv.get(varActTransIdx[k])).val()+" ) != " + -1);
					return false;
				}
								
			}
		}
		
		// All the transitions caused by valActionIdx
		int[] valActTransIdx = (int[]) SASProblem.actionCaused.get(valActionIdx);
		
		for ( int k = 0; k < valActTransIdx.length; ++k)
		{
			//PrintStat.transitionActCount++;
			//then all other transitions should be in the plan, sice the action is in the plan
			if (iv.get(valActTransIdx[k]).nq(home, CSPOrderBasedEnc2.NOT_IN_PLAN).failed())
			{
				//Utils.debug("Failed to set (val) "+ valActTransIdx[k] + "( "+ ((IntVarView)iv.get(valActTransIdx[k])).val()+" ) != " + -1);
				return false;
			}
						        					
		}
		
		return true;
	}
	
	
	private boolean cycleCheckConstraint(Space home, int transIndx, int val)
	{
		currentSupportedTransition = transIndx;
		currentSupportingTransition = val;
		
		ArrayList<Integer> supported   = new ArrayList<Integer>();
		ArrayList<Integer> supporting  = new ArrayList<Integer>();
		
		//Utils.debug("Transition "+j+" = "+ trans.val());
		// action that caused this transition (which is the variable)
		int varActionIdx = SASProblem.transitionCausedBy[transIndx];//Integer.parseInt(trans.getName())];
		int valActionIdx = SASProblem.transitionCausedBy[val];
		
		supportedTransitions  = new ArrayList<Integer>();
		//supportedTransitions.add(0, new Integer(j));
		
		supportingTransitions = new ArrayList<Integer>();
		//supportingTransitions.add(0, new Integer(val));
		
		supported.add(new Integer(varActionIdx));
		getSupported(supported);
		
		supporting.add(new Integer(valActionIdx));
		getSupporting(supporting);
		
		//for each supporting transitions
		for ( int k = 0; k < supportingTransitions.size(); ++k)
		{
			
			int supportingTrans = ((Integer)supportingTransitions.get(k)).intValue();
			IntVarView suTrans = (IntVarView)iv.get(supportingTrans);
			for (int l = 0; l < supportedTransitions.size(); ++l)
			{
				//if ( k!= 0 && l!= 0)
				//{
					int supportedTrans = ((Integer)supportedTransitions.get(l)).intValue();
					if( suTrans.in(supportedTrans))
					{
						//Utils.debug("Removing Cycle ....");
						PrintStat.cycleProCount++;
						if (iv.get(supportingTrans).nq(home, supportedTrans).failed())
						{
							//Utils.debug("Cycle check - Failed");
							return false;
						}
						else
						{
							//removed = true;
							//Utils.debug("removed "+SASProblem.transitions.get(supportedTrans)+" from "+SASProblem.transitions.get(supportingTrans)+"'s domain");
							break;
						}
					}
				//}
				
			}
			    						
		}
		
		return true;
		
	}
	
	private void getSupported(ArrayList<Integer> supported)
	{
		boolean isAsValue = false;
		//Utils.debug(" Supported Actions");//
		int length = 0;
		while ( length < supported.size() )
		{
			Integer action = (Integer)supported.get(length);
			int actionIdx = action.intValue();
			
			//ArrayList act = new ArrayList();
			//act.add( new Integer (varActionIdx) );
			//supportedGraph[actionIdx] = act;
			
			//all the transitions caused by the action
			int[] actTransIdxs = (int[])SASProblem.actionCaused.get(actionIdx);
			//Utils.debug("For action...." + actionIdx);
			for ( int i = 0; i < actTransIdxs.length; ++i)
			{
				//act = new ArrayList();
				isAsValue = false;
				//IntVarView transN = (IntVarView)iv.get(actTransIdxs[i]);
				
				for ( int j = 0; j <= transitionCount; ++j)
			    {
					// if the transiton is assigned i.e. has one enabling transition, then both transitions effects will be activated
			    	IntVarView trans = (IntVarView)iv.get(j); //transition
			    	if ( trans.assigned())
			    	{
			    		//Utils.debug("For "+ j + " = "+ trans.val());
			    		int val = trans.val();
			    		// provided that it is already in the plan
			    		if ( val >= 0)
			    		{
			    			
			    			if (val == actTransIdxs[i])
			    			{
			    				isAsValue = true;
			    				//currentSupportedTransition = j;
			    				//Utils.debug("For "+ val +" = "+ actTransIdxs[i]);
			    				int varActionIdx = SASProblem.transitionCausedBy[j];
			    				if ( !supported.contains(new Integer(varActionIdx)) )
			    				{
			    					//act.add( new Integer (varActionIdx) );
			    					supported.add( new Integer(varActionIdx));
			    					break;
				    				//getSupported(supported);
			    				}
			    				
			    			}
			    		}
			    	}
			    }
				if ( !isAsValue )
				{
					//add these transitions in the supportedTransition list
					if ( !supportedTransitions.contains( new Integer(actTransIdxs[i]) ) )
					{
						supportedTransitions.add( new Integer(actTransIdxs[i]) );
					}
						
				}
				
			}
			//Utils.debug("Adding supportedGraph["+actionIdx+"] = "+act.size());
			//supportedGraph[actionIdx] = act;
			length++;
			
		}
		
		
		/**
		Iterator ir = supported.iterator();
		while ( ir.hasNext() )
		{
			Utils.debug(""+ir.next().toString());
		}
		*/
		return ;
	}
	
	private void getSupporting(ArrayList<Integer> supporting)
	{
		//ArrayList act;
		//Utils.debug(" Supporting Actions");//Transitions ");
		int length = 0;
		while ( length < supporting.size() )
		{
			Integer action = (Integer)supporting.get(length);
			int actionIdx = action.intValue();
			
			//act = new ArrayList();
			
			//all the transitions caused by the action
			int[] actTransIdxs = (int[])SASProblem.actionCaused.get(actionIdx);
			//Utils.debug("For action...." + actionIdx + "  "+ actTransIdxs.length);
			for ( int i = 0; i < actTransIdxs.length; ++i)
			{
				IntVarView trans = (IntVarView)iv.get(actTransIdxs[i]);
				if ( trans.assigned() )
				{
					int val = trans.val();
					if ( val >= 0)
					{
						
						int valActionIdx = SASProblem.transitionCausedBy[val];
						
						if ( !supporting.contains(new Integer(valActionIdx)) )
	    				{
							//act.add( new Integer(valActionIdx));
	    					supporting.add( new Integer(valActionIdx));
	    					
	    					//getSupporting(supporting);
	    				}
					}
					
				}// if it is not assigned yet
				else
				{
					if ( !supportingTransitions.contains( new Integer(actTransIdxs[i])))
					{
						supportingTransitions.add ( new Integer(actTransIdxs[i]));
													
					}
				}
				
				//}
			}
			//Utils.debug("Adding supportingGraph["+actionIdx+"] = "+act.size());
			//supportingGraph[actionIdx] = act;
			length++;
			
		}
		
		/**
		Iterator ir = supporting.iterator();
		while ( ir.hasNext() )
		{
			Utils.debug(""+ir.next().toString());
		}
	    */
		return ;
	}
	
	
	//post
	public static void post(Space home, VarArray<IntVar> arr)
	{
		ViewArray<IntVarView> narr= new ViewArray<IntVarView>(home, IntVarView.class, arr);
		Gecode.addPropagator(home, new CSPConstraintsPropagator<IntVarView> ( home, narr));
	}
}
