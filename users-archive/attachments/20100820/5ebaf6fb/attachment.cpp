#include <gecode/driver.hh>
#include <gecode/int.hh>
#include <gecode/search.hh>
#include <gecode/minimodel.hh>
#include <gecode/gist.hh>

using namespace Gecode;
static const double minRange = 100;
static const double maxRange = 400;


class Parallelepiped : public Space {
    protected:
        IntVarArray lengths;
        IntVarArray kcosines;
    public:
        // i could constrain more the ranges of kcosines and further tmp variables, 
        // but it doesn't affect much the running time and i want to be sure that's not what's creating the bug
        Parallelepiped(const Options &opt=0) : lengths(*this, 13, minRange, maxRange), kcosines(*this,4,Int::Limits::min,Int::Limits::max){
            IntVar x0(lengths[0]), x1(lengths[1]), x2(lengths[2]),
                   d01min(lengths[3]),d01maj(lengths[4]),d02min(lengths[5]),d02maj(lengths[6]),d12min(lengths[7]),d12maj(lengths[8]),
                   m0(lengths[9]),m1(lengths[10]),m2(lengths[11]),m3(lengths[12]);
            IntVar k(kcosines[0]),kc01(kcosines[1]),kc02(kcosines[2]),kc12(kcosines[3]);

            // x0 >= x1 >= x2
            rel(*this, x0 >= x1);
            rel(*this, x1 >= x2);
            // parallelepiped x0x1 is perfect
            rel(*this, d01min > x0-x1);
            rel(*this, sqr(d01min) <= sqr(x0)+sqr(x1));
            rel(*this, 2*sqr(x0)+2*sqr(x1)-sqr(d01min)-sqr(d01maj) == 0);
            // parallelepiped x0x2 is perfect
            rel(*this, d02min > x0-x2);
            rel(*this, sqr(d02min) <= sqr(x2)+sqr(x0));
            rel(*this, 2*sqr(x2)+2*sqr(x0)-sqr(d02min)-sqr(d02maj) == 0);
            // parallelepiped x1x2 is perfect
            rel(*this, d12min > x1-x2);
            rel(*this, sqr(d12min)<= sqr(x2)+sqr(x1));
            rel(*this, 2*sqr(x2)+2*sqr(x1)-sqr(d12min)-sqr(d12maj) == 0);
            // inner diagonal m1 is an integer
            rel(*this, sqr(m0) == (-sqr(x0))+sqr(x1)+sqr(x2)+sqr(d01min)+sqr(d02min)+(-sqr(d12min)));
            rel(*this, sqr(m1)== sqr(x0)+(-sqr(x1))+sqr(x2)+sqr(d01min)+(-sqr(d02min))+sqr(d12min));
            rel(*this, sqr(m2) == sqr(x0)+sqr(x1)+(-sqr(x2))+(-sqr(d01min))+sqr(d02min)+sqr(d12min));
            rel(*this, sqr(m3) == 3*(sqr(x0)+sqr(x1)+sqr(x2))-(sqr(d01min)+sqr(d02min)+sqr(d12min)));

            // Setting those fixed variables with expr instead of rel makes the code return immediately 
            //    k = expr(*this, 2*x0*x1*x2);
            //    kc01 = expr(*this,x2*(sqr(x0)+sqr(x1)-sqr(d01min)));
            //    kc02 = expr(*this,x1*(sqr(x0)+sqr(x2)-sqr(d02min)));
            //    kc12 = expr(*this,x0*(sqr(x2)+sqr(x1)-sqr(d12min)));
            rel(*this, k==2*x0*x1*x2);
            rel(*this, kc01==x2*(sqr(x0)+sqr(x1)-sqr(d01min)));
            rel(*this, kc02==x1*(sqr(x0)+sqr(x2)-sqr(d02min)));
            rel(*this, kc12==x0*(sqr(x2)+sqr(x1)-sqr(d12min)));

#define MINIMODEL
#ifdef MINIMODEL
            // This constraint makes the code return immediately; if commented a solution which is compliant to it is returned!
            rel(*this,k*(sqr(kc01)+sqr(kc02)+sqr(kc12)) < (k*k*k+2*kc01*kc02*kc12));
#else
            // And this set of constraints (equiv to the previous one) makes it crashes equally
            // Even just the first constraint sqr makes it crash
            IntVarArray tmp(*this,7,Int::Limits::min,Int::Limits::max);
            IntVarArray lin(*this,5,Int::Limits::min,Int::Limits::max);
            IntVar kc01kc01(tmp[0]),kc02kc02(tmp[1]),kc12kc12(tmp[2]),kk(tmp[3]),kc01kc02(tmp[4]),kc01kc02kc12(tmp[5]),kkk(tmp[6]);
            IntVar _kkk(lin[0]),_2kc01kc02kc12(lin[1]),kkc01kc01(lin[2]),kkc02kc02(lin[3]),kkc12kc12(lin[4]);
            IntVar _one = expr(*this,-1);
            IntVar _two = expr(*this,-2);
            sqr(*this,kc01,kc01kc01);
            mult(*this,kc01kc01,k,kkc01kc01);
            sqr(*this,kc02,kc02kc02);
            mult(*this,kc02kc02,k,kkc02kc02);
            sqr(*this,kc12,kc12kc12);
            mult(*this,kc12kc12,k,kkc12kc12);
            sqr(*this,k,kk);
            mult(*this,kk,k,kkk);
            mult(*this,kkk,_one,_kkk);
            mult(*this,kc01,kc02,kc01kc02);
            mult(*this,kc01kc02,kc12,kc01kc02kc12);
            mult(*this,kc01kc02kc12,_two,_2kc01kc02kc12);
            linear(*this,lin,IRT_LE,0);
#endif


            // rel branching
            branch(*this, lengths, INT_VAR_SIZE_MIN, INT_VAL_MIN);
        }
        // search support
        Parallelepiped(bool share, Parallelepiped& s) : Space(share, s) {
            lengths.update(*this, share, s.lengths);
            kcosines.update(*this, share, s.kcosines);
        }
        virtual Space* copy(bool share) {
            return new Parallelepiped(share,*this);
        }
        // print solution
        void print(std::ostream& os) const {
            os << lengths << std::endl;
            os << kcosines << std::endl;
        }
        void print(void) const {
            std::cout << lengths << std::endl;
            std::cout << kcosines << std::endl;
        }
        void compare(const Space& s, std::ostream& os) const {
            os << Gist::Comparator::compare<IntVar>("lengths",lengths,
                    static_cast<const Parallelepiped&>(s).lengths);
        }

};

// main function
int main(int argc, char* argv[]) {
    Options opt("Parallelepiped");
    opt.parse(argc,argv);
    Script::run<Parallelepiped,DFS,Options>(opt);
    return 0;

    //  Parallelepiped* m = new Parallelepiped;
    //  DFS<Parallelepiped> e(m);
    //  delete m;
    //  // search and print all solutions
    //  while (Parallelepiped* s = e.next()) {
    //    s->print(); delete s;
    //  }
    //  return 0;

    //  Parallelepiped* m = new Parallelepiped;
    //  Gist::dfs(m);
    //  delete m;
    //  return 0;
}