
#ifndef __GECODE_INT_TUNNELING_HH__
#define __GECODE_INT_TUNNELING_HH__

#include <set>
#include "int.hh"
#include "int/element.hh"

namespace Gecode { namespace Int { namespace Tunneling {

  /**
   * \namespace Gecode::Int::Tunneling
   * \brief Propagators for ... // TODO
   */

  class Tunneling : public Propagator {
  protected:
    ViewArray<IntView> suc;
    ViewArray<IntView> pre;
    ViewArray<IntView> veh;
    
    std::set<int> procSuc;
    std::set<int> procPre;
    std::set<int> procVeh; // variables that have already been processed
    
    std::set<int>* (*overlapping)(const int&);
    
    /// Constructor for cloning \a p
    Tunneling(Space* home, bool share, Tunneling&);
    /// Constructor for posting
    Tunneling(Space* home, ViewArray<IntView>&, ViewArray<IntView>&, ViewArray<IntView>&, std::set<int>* (*fptr)(const int&));
  public:
    /// Copy propagator during cloning
    GECODE_INT_EXPORT virtual Actor* copy(Space* home,bool);
    /// Perform propagation
    GECODE_INT_EXPORT virtual ExecStatus propagate(Space* home);

    GECODE_INT_EXPORT virtual PropCost cost(void) const;
    /// Destructor
    GECODE_INT_EXPORT virtual ~Tunneling(void);

    static  ExecStatus  post(Space* home, ViewArray<IntView>& x, ViewArray<IntView>& y, ViewArray<IntView>& z, std::set<int>* (*fptr)(const int&));
  };


}}}

#include "int/tunneling/tunneling.icc"

#endif

// STATISTICS: set-prop
