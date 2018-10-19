#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <stdexcept>

#include <boost/program_options.hpp>
#include <gecode/driver.hh>
#include <gecode/int.hh>
#include <gecode/set.hh>
#include <gecode/minimodel.hh>
#include "cfg.hpp"
#include "cfgparser.hpp"

using namespace std;
namespace po = boost::program_options;

using namespace Gecode;

class Homomorph: public Script {
protected:
  SetVarArray g1_edges;
  //SetVarArray g2_edges;
  SetVarArray g1_reach;
  //SetVarArray g2_reach;

  //IntVarArray mapping;
public:
  Homomorph(const Options& opt) :
      g1_edges(*this, 6, IntSet::empty, IntSet(0, 5)),
  //    g2_edges(*this, 6, IntSet::empty, IntSet(0, 5)),
      g1_reach(*this, 6, IntSet::empty, IntSet(0, 5))
    //  g2_reach(*this, 6, IntSet::empty, IntSet(0, 5)),
     // mapping(*this, 5, 0, 5)
  {
      // define edges between nodes
      dom(*this, g1_edges[0], SRT_EQ, IntSet(1, 2));
      dom(*this, g1_edges[1],  SRT_EQ, 5 );
      dom(*this, g1_edges[2], SRT_EQ,  IntSet(3,4));
      dom(*this, g1_edges[3],  SRT_EQ, 5);
      dom(*this, g1_edges[4],  SRT_EQ, 5 );
      dom(*this, g1_edges[5],  SRT_EQ, IntSet::empty);
/*
      dom(*this, g2_edges[5], SRT_EQ, IntSet(3, 4));
      dom(*this, g2_edges[1],  SRT_EQ, 0 );
      dom(*this, g2_edges[2], SRT_EQ,  0);
      dom(*this, g2_edges[3],  SRT_EQ, IntSet(1,2));
      dom(*this, g2_edges[4],  SRT_EQ, 0 );
      dom(*this, g2_edges[0],  SRT_EQ, IntSet::empty);
*/
      // define reachability sets
      for(int x = 0; x < 6; ++x )
      {
          rel(*this, g1_reach[x] >= g1_edges[x]);
          element(*this, SOT_UNION, g1_reach, g1_reach[x], g1_reach[x]);
      }
      branch(*this, g1_reach, SET_VAR_NONE(), SET_VAL_MIN_INC());
  }

  virtual void
  print(std::ostream& os) const
  {
    os << "\t" << g1_edges << std::endl;
    os << "\t" << g1_reach << std::endl;
  }

  Homomorph(bool share, Homomorph& s) : Script(share,s) {
    g1_edges.update(*this, share, s.g1_edges);
  }

  virtual Space*
  copy(bool share) {
    return new Homomorph(share,*this);
  }
};

int
main(int argc, char* argv[]) {
  Options opt("SEND+MORE=MONEY");
  opt.solutions(0);
  opt.iterations(20000);
  opt.parse(argc,argv);
  Script::run<Homomorph,DFS,Options>(opt);
  return 0;
}
