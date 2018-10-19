#include "examples/support.hh"
#include "set.hh"
class RecoTest: public Example {
    protected:
        SetVar nodes;
        SetVarArray v;
    public: 
        RecoTest(const Options& opt): 
                nodes(this,IntSet::empty,0,opt.size-1),
                v(this,opt.size,IntSet::empty,0,opt.size-1) {

            BoolVarArray b(this,3*opt.size,0,1);
            #define iInNodes(i)  b[0+3*(i)]
            #define iNotInNodes(i) b[1+3*(i)]
            #define iOutsEmpty(i) b[2+3*(i)]
            for (int i=opt.size ; i--;){
                dom(this, nodes, SRT_SUP, i, iInNodes(i));
                bool_not(this, iInNodes(i), iNotInNodes(i));
                dom(this, v[i], SRT_EQ, IntSet::empty, iOutsEmpty(i)); 
            }
            // no_node -> no incoming arc, arc -> target node
            for (int i=opt.size; i--;){
                rel(this, v[i], SRT_SUB, nodes);
            }
            // no_node -> no outgoing arc, arc -> source node
            BoolVar True(this,1,1);
            for (int i=opt.size; i--;){
                bool_imp(this,iNotInNodes(i),iOutsEmpty(i),True);
            }

            SetVarArgs a(v.size()+1);
            for (int i=0; i<v.size();++i){
                    a[i]=v[i];
            }
            a[v.size()] = nodes;
            branch(this,a,SETBVAR_NONE,SETBVAL_MIN);
        }
        RecoTest(bool share, RecoTest& s) : Example(share,s){
            nodes.update(this, share, s.nodes);
            v.update(this, share, s.v);
        }
        virtual Space* copy(bool share) {
            return new RecoTest(share,*this);
        }
        virtual void print(void) {
                std::cout << nodes << std::endl;
                for (int i=0; i< v.size(); ++i)
                    std::cout << v[i] << std::endl; 
                std::cout << "----"<<std::endl;
        }
};

int
main(int argc, char** argv) {
  Options opt("RecoTest");
  opt.a_d    = 1000;
  opt.c_d    = 1;
  opt.icl    = ICL_DOM;
  opt.solutions    = 0;
  opt.parse(argc,argv);
  Example::run<RecoTest,DFS>(opt);
  return 0;
}
