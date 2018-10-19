// Square Packing.cpp : Defines the entry point for the console application.
//

#include <gecode/int.hh>
#include <gecode/search.hh>
#include <gecode/gist.hh>
#include <gecode/driver.hh>
#include <gecode/minimodel.hh>

#include <type_traits>
#include <array>
#include <cmath>

void nooverlap(Gecode::Home home, 
			   const Gecode::IntVarArgs& x, const Gecode::IntArgs& width,
			   const Gecode::IntVarArgs& y, const Gecode::IntArgs& height);

namespace Impl
{
	// Calculate upper bound for s and coordinates (x, y)
	template<size_t N>
	struct CalcUpperSizeBound
	{
		static const size_t val = N + CalcUpperSizeBound<N - 1>::val;
	};

	template<>
	struct CalcUpperSizeBound<0>
	{
		static const size_t val = 0;
	};
}

template<int N>
class XSquarePacking: public Gecode::MinimizeScript //: public XGecodeBase<XSquarePacking<N>, Gecode::MinimizeScript>
{
private:
	static_assert(N > 0, "N must be greater than 0.");
	typedef typename std::remove_const<decltype(N)>::type It_t;

	// Variables
	Gecode::IntVarArray m_x, m_y;
	Gecode::IntVar m_s;

	// Return the size of a squares, where VarIndex is the index of the square
	It_t SizeOfSquare(size_t VarIndex) const
	{
		typedef It_t value_type;
		static std::array<value_type, N> SizeTbl;
		static bool TblInitialized = false;
		if (!TblInitialized)
		{
			for (size_t ArrayIdx = 0, Size = N; ArrayIdx < SizeTbl.size(); ArrayIdx++, Size--)
				SizeTbl.at(ArrayIdx) = static_cast<value_type>(Size);
			TblInitialized = true;
		}
		return SizeTbl.at(VarIndex);
	}

public:
	// Worst case scenario: all squares are packed vertically or horizontally.
	// In that case, we need 1 + 2 + ... + N units of width or length to fit them
	// all.
	// The minimal size of s must be at least N because otherwise the square of
	// length NxN cannot fit. Likewise, it must be N + N-1, otherwise we cannot
	// fit the NxN square AND the N-1 square because there must be at least
	// N + N-1 units of length available on either the width or height.
	XSquarePacking(const Gecode::Options&):
		m_x(*this, N, 0, Impl::CalcUpperSizeBound<N>::val),
		m_y(*this, N, 0, Impl::CalcUpperSizeBound<N>::val),
		m_s(*this, (int)std::ceil(std::sqrt((N*(N + 1)*(2*N + 1))/6)), Impl::CalcUpperSizeBound<N>::val)
	{
		auto PropagationStrength = Gecode::ICL_VAL;

		// Make sure no squares overlap (no overlap propagator)
		// <--------------- BLOCK A START
		auto SizeTbl = Gecode::IntArgs::create(N, N, -1);
		::nooverlap(*this, m_x, SizeTbl, m_y, SizeTbl);
		//Gecode::nooverlap(*this, m_x.c, SizeTbl, m_y.c, SizeTbl, Gecode::ICL_BND);

		// ---------------> BLOCK A END
		// Make sure that all squares stay inside s.
		for (It_t i = 0; i < N; i++)
		{
			Gecode::rel(*this, m_x[i] + SizeOfSquare(i) <= m_s, PropagationStrength);
			Gecode::rel(*this, m_y[i] + SizeOfSquare(i) <= m_s, PropagationStrength);
		}

		// Branch on s, then x0, y1, x1, y1 ... xN-1, yN-1
		Gecode::branch(*this, m_s, Gecode::INT_VAL_MIN());
		for (It_t i = 0; i < m_x.size(); i++)
		{
			Gecode::branch(*this, m_y[i], Gecode::INT_VAL_SPLIT_MIN());
			Gecode::branch(*this, m_x[i], Gecode::INT_VAL_SPLIT_MIN());
		}
	}

	XSquarePacking(XSquarePacking<N>& that, bool share): Gecode::MinimizeScript(share, that)
	{
		m_x.update(*this, share, that.m_x);
		m_y.update(*this, share, that.m_y);
		m_s.update(*this, share, that.m_s);
	}

	virtual Gecode::Space* copy(bool share)
	{
		return new XSquarePacking<N>(*this, share);
	}

	virtual Gecode::IntVar cost() const { return m_s; }
};

int main()
{
	typedef XSquarePacking<8> Model_t;
	Gecode::Options opt("Square Packing");
	opt.mode(Gecode::SM_GIST);

	Gecode::MinimizeScript::run<Model_t, Gecode::BAB>(opt);
	return 0;
}