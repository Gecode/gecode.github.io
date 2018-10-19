#include "int.hh"
#include "int/tunneling.hh"
#include "int/rel.hh"
#include "int/element.hh"

namespace Gecode { namespace Int { namespace Tunneling {

  Actor*
  Tunneling::copy(Space* home, bool share) {
    return new (home) Tunneling(home,share,*this);
  }

  PropCost
  Tunneling::cost(void) const {
    return PC_CUBIC_LO; // TODO
  }

  Tunneling::~Tunneling(void) {
  	suc.cancel(this,PC_INT_VAL);
  	pre.cancel(this,PC_INT_VAL);
  	veh.cancel(this,PC_INT_VAL);
  }

  ExecStatus Tunneling::propagate(Space* home) {
	for (int i=0; i<suc.size(); ++i) {
		if (suc[i].assigned() && procSuc.find(i) == procSuc.end()) {
			GECODE_ES_CHECK( Rel::EqDom<IntView>::post(home, veh[i], veh[ suc[i].val() ]) );
			procSuc.insert(i);
		}
		if (pre[i].assigned() && procPre.find(i) == procPre.end()) {
			GECODE_ES_CHECK( Rel::EqDom<IntView>::post(home, veh[i], veh[ pre[i].val() ]) );
			procPre.insert(i);
		}
		if (veh[i].assigned() && procVeh.find(i) == procVeh.end()) {
			IntVarArgs xa(veh.size());
			for (int j=veh.size(); j--; ) {
			   IntVar v(veh[j]);
			   xa[j] = v;
			}
			Element::IdxView<IntView>* iv1 = Element::IdxView<IntView>::init(home,xa);
			Element::IdxView<IntView>* iv2 = Element::IdxView<IntView>::init(home,xa);
			if ( Element::ViewDom<IntView,IntView>::post(home, iv1, veh.size(), suc[i], veh[i]) == Gecode::ES_FAILED )
				return ES_FAILED;
			if ( Element::ViewDom<IntView,IntView>::post(home, iv2, veh.size(), pre[i], veh[i]) == Gecode::ES_FAILED )
				return ES_FAILED;
			std::set<int>* overlaps = (*overlapping) (i);
			for (std::set<int>::iterator it = overlaps->begin(); it != overlaps->end(); ++it) {
				GECODE_ME_CHECK(veh[*it].nq(home,veh[i].val()));
			}
			procVeh.insert(i);
		}
  	}
    return ES_FIX;
  }

}}}

