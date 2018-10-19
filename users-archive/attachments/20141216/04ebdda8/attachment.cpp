#include <gecode/int.hh>
#include <gecode/search.hh>
#include <gecode/driver.hh>
#include <gecode/minimodel.hh>

using namespace Gecode;

class NQueen : public Script {
protected:
	IntVarArray q;
	const SizeOptions& opt;
public:
	NQueen(const SizeOptions& _opt) : q(*this, _opt.size(), 1, _opt.size()), opt(_opt) {
		distinct(*this, q);
		for (int i = 0; i < opt.size(); i++){
			for (int j = i + 1; j < opt.size(); j++){
				rel(*this, abs(q[i] - q[j]) != j - i);
			}
		}
		branch(*this, q, INT_VAR_SIZE_MIN(), INT_VAL_MIN());
	}
	NQueen(bool share, NQueen& s) : Script(share, s), opt(s.opt) {
		q.update(*this, share, s.q);
	}
	virtual Space* copy(bool share) {
		return new NQueen(share, *this);
	}
	virtual void print(std::ostream& os) const {
		os << q << std::endl;
	}
};

int main(int argc, char* argv []){
	SizeOptions opt("NQueen");
	opt.size(4);
	opt.solutions(0);
	opt.parse(argc, argv);
	//Script::run<NQueen, DFS, SizeOptions>(opt);
	Search::Options o;
	o.cutoff = Search::Cutoff::geometric(10, 1.5);
	NQueen* q = new NQueen(opt);
	RBS<DFS, NQueen> e(q, o);
	delete q;
	// Use the search engine to find all solutions
	while (NQueen*s = e.next()) {
		s->print(std::cout); delete s;
	}
	//getchar();
	//Script::run<NQueen, RBS, SizeOptions>(opt);
	return 0;
}