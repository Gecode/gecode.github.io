/*
*  Main author:
*     Christian Schulte <cschulte@kth.se>
*
*  Copyright:
*     Christian Schulte, 2009
*
*  Permission is hereby granted, free of charge, to any person obtaining
*  a copy of this software and associated documentation files (the
*  "Software"), to deal in the Software without restriction, including
*  without limitation the rights to use, copy, modify, merge, publish,
*  distribute, sublicense, and/or sell copies of the Software, and to
*  permit persons to whom the Software is furnished to do so, subject to
*  the following conditions:
*
*  The above copyright notice and this permission notice shall be
*  included in all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
*  Em_xPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
*  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
*  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
*  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
*  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
*  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*
*/

#include <gecode/int.hh>
#include <vector>
#include <algorithm>

template<typename T, template<typename> class Allocator = Gecode::space_allocator>
class XGecodeVector2
{
private:
	std::vector<T, Allocator<T>> m_v;
	bool m_valid;

public:
	std::vector<T, Allocator<T>>& v() { assert(m_valid); return m_v; };

	template<typename... Args_t>
	XGecodeVector2(Gecode::Region& region, Args_t... Args): m_v(Args..., Allocator<T>(region)), m_valid(true) {}
	template<typename... Args_t>
	XGecodeVector2(Gecode::Home home, Args_t... Args): m_v(Args..., Allocator<T>(home)), m_valid(true) {}

	XGecodeVector2(Gecode::Space& home, const XGecodeVector2& that): m_v(that.m_v.size(), T(), Allocator<T>(home)), m_valid(that.m_valid)
	{
		// Apparently Mingw/Clang does not implement std::vector<T, Allocator<T>>(const std::vector<T>&, Allocator<T>)...
		// So we have to use a workaround!
		std::copy(that.m_v.begin(), that.m_v.end(), m_v.begin());
	}

	XGecodeVector2(XGecodeVector2&& that): m_v(std::move(that.m_v)), m_valid(true) {}

	~XGecodeVector2() { m_valid = false; }
};


// The no-overlap propagator
class NoOverlap: public Gecode::Propagator
{
protected:
	struct XRectangle2
	{
		Gecode::Int::IntView* x;
		Gecode::Int::IntView* y;
		int width, height;
	};

	// The x and y coordinates
	Gecode::ViewArray<Gecode::Int::IntView> m_x, m_y;
	// The width and height arrays
	XGecodeVector2<int> m_width, m_height;

public:
	NoOverlap(Gecode::Home home, 
		Gecode::ViewArray<Gecode::Int::IntView>& x, XGecodeVector2<int>& width, 
		Gecode::ViewArray<Gecode::Int::IntView>& y, XGecodeVector2<int>& height):
			Gecode::Propagator(home), m_x(x), m_y(y), m_width(std::move(width)), m_height(std::move(height))
	{
		m_x.subscribe(home, *this, Gecode::Int::PC_INT_BND);
		m_y.subscribe(home, *this, Gecode::Int::PC_INT_BND);
	}

	NoOverlap(Gecode::Space& home, bool Share, NoOverlap& that): Gecode::Propagator(home, Share, that), 
		m_x(that.m_x), m_y(that.m_y), m_width(home, that.m_width), m_height(home, that.m_height)
	{
		m_x.update(home, Share, that.m_x);
		m_y.update(home, Share, that.m_y);
	}

	// Return cost (defined as cheap quadratic)
	virtual Gecode::PropCost cost(const Gecode::Space&, const Gecode::ModEventDelta&) const
	{
		return Gecode::PropCost::quadratic(Gecode::PropCost::LO,2*m_x.size());
	}

	template<typename... T>
	static Gecode::ExecStatus post(Gecode::Home home, Gecode::PropCond, Gecode::ViewArray<Gecode::Int::IntView> x, T&&... args)
	{
		// Only if there is something to propagate
		if (x.size() > 1)
			new (home) NoOverlap(home, x, args...);
		return Gecode::ES_OK;
	}

	virtual Propagator* copy(Gecode::Space& home, bool share)
	{
		return new (home) NoOverlap(home, share, *this);
	}

	virtual size_t dispose(Gecode::Space& home) 
	{
		m_x.cancel(home, *this, Gecode::Int::PC_INT_BND);
		m_y.cancel(home, *this, Gecode::Int::PC_INT_BND);
		Propagator::dispose(home);
		return sizeof(*this);
	}

private:
	// Holds all information about a specific square
	XRectangle2 CreateRectangle2(size_t var_id)
	{
		XRectangle2 rect = { &m_x[(int)var_id], &m_y[(int)var_id], m_width.v().at(var_id), m_height.v().at(var_id) };
		assert(rect.width > 0);
		assert(rect.height > 0);
		assert(rect.width == rect.height);
		return rect;
	}

	struct PropagationResult
	{
		bool PropagationDone;
		Gecode::ExecStatus Status;
	};

	template<typename CheckResult_t>
	PropagationResult PropagateImpl(CheckResult_t, PropagationResult& Result)
	{
		return Result;
	}

	template<typename Propagator_t, typename CheckResult_t, typename... Propagators_t>
	PropagationResult PropagateImpl(CheckResult_t CheckResult, PropagationResult& Result, Propagator_t&& propagator, Propagators_t&&... propagators)
	{
		if ( !CheckResult(propagator()) ) return Result;
		return PropagateImpl(CheckResult, Result, propagators...);
	}

	template<typename... Propagators_t>
	PropagationResult Propagate(Propagators_t&&... propagators)
	{
		// Exceptions are ideal, but too expensive.
		PropagationResult Result;
		auto CheckResult = [&](Gecode::ModEvent status)
		{
			switch (status)
			{
				case Gecode::Int::ME_INT_NONE: Result.PropagationDone = Result.PropagationDone || false; break;
				case Gecode::Int::ME_INT_FAILED: Result.Status = Gecode::ES_FAILED; return false;
				default: Result.PropagationDone = true; break;
			}
			Result.Status = Gecode::ES_OK;
			return true;
		};
		return PropagateImpl(CheckResult, Result, propagators...);
	}

	// Perform propagation
	// NOTE: Assumes bound consistency! The domains of x and y shall be contiguous!
	virtual Gecode::ExecStatus propagate(Gecode::Space& home, const Gecode::ModEventDelta&)
	{
		size_t NumVars = (size_t)m_x.size();
		
		// This variable contains the number of non-overlapping squares detected during propagation. Used to determine if
		// subsumption has been hit or not.

		// This variable remembers if any propagation was done or not. Used to know if we are at fixpoint or not.
		PropagationResult result = { false, Gecode::ES_OK };

		// For every variable...
		for (size_t idx_r1 = 0; idx_r1 < m_x.size() - 1; idx_r1++)
		{
			// If true if the current square (idx_r1) cannot overlap with any other square.
			bool CannotOverlap = false;

			const auto & r1 = CreateRectangle2(idx_r1);
			int oblig_x1 = r1.x->max();
			int oblig_x2 = r1.x->min() + r1.width - 1;
			int oblig_y1 = r1.y->max();
			int oblig_y2 = r1.y->min() + r1.height - 1;
			bool ObligatoryExists = (oblig_x1 >= 0 && oblig_y1 >= 0 && oblig_x1 <= oblig_x2 && oblig_y1 <= oblig_y2);

			// For every other variable + symmetry breaking
			// Consider: When checking square 0, we want to start checking from square 1 since comparing against itself is pointless.
			// Then, consider when checking square 1, due to symmetry, we don't need to check against square 0 (already did it).
			// Generalizing this, square k has already been checked for squares 0...k-1, so we can start from k+1.
			for (size_t idx_r2 = idx_r1 + 1; idx_r2 < m_x.size(); idx_r2++)
			{
				CannotOverlap = true;
				const auto & r2 = CreateRectangle2(idx_r2);
				
				bool IsAbove, IsBelow, IsLeft, IsRight;
				bool CanBeAbove, CanBeBelow, CanBeLeft, CanBeRight;

				if (ObligatoryExists)
				{
					int width = oblig_x2 - oblig_x1 + 1;
					int height = oblig_y2 - oblig_y1 + 1;

					IsAbove = (r2.y->max() <= oblig_y1 - r2.height);
					IsBelow = (r2.y->min() >= oblig_y2 + height);
					IsLeft = (r2.x->max() <= oblig_x1 - r2.width);
					IsRight = (r2.x->min() >= oblig_x2 + width);

					CanBeAbove = (r2.y->min() <= oblig_y1 - r2.height);
					CanBeBelow = (r2.y->max() > oblig_y2);
					CanBeLeft = (r2.x->min() <= oblig_x1 - r2.width);
					CanBeRight = (r2.x->max() > oblig_x2);
				}
				else
				{
					IsAbove = (r2.y->max() <= r1.y->min() - r2.height);
					IsBelow = (r2.y->min() >= r1.y->max() + r1.height);
					IsLeft = (r2.x->max() <= r1.x->min() - r2.width);
					IsRight = (r2.x->min() >= r1.x->max() + r1.width);

					CanBeAbove = (r2.y->min() <= r1.y->max() - r2.height);
					CanBeBelow = (r2.y->max() >= r1.y->min() + r1.height);
					CanBeLeft = (r2.x->min() <= r1.x->max() - r2.width);
					CanBeRight = (r2.x->max() >= r1.x->min() + r1.width);
				}

				bool CannotOverlapTmp = (IsAbove || IsBelow || IsLeft || IsRight);
				CannotOverlap = CannotOverlap && CannotOverlapTmp;

				// Propagate and update statistics
				if (!CanBeAbove && !CanBeBelow && !CanBeLeft && !CanBeRight)
					return Gecode::ES_FAILED;

				// 1x1 square optimization. If it does anything, it sure doesn't show.
				if (idx_r2 == NumVars - 1)
					continue; // This is the smallest variable. Don't propagate for this one.

				// Helper function that checks result of propagation. Updates propagation variable if propagation was done.
				// Fails if the propagation failed.
				if (!CanBeAbove && !CanBeBelow && !CanBeLeft && CanBeRight)
					// Symmetry: if r2 can be right of r1, then r1 can be left of r2. Same for all other cases.
					result = Propagate(
						[&] { return r2.x->gq(home, r1.x->min() + r1.width); },
						[&] { return r1.x->lq(home, r2.x->max() - r1.width); }
					);
				else if (!CanBeAbove && !CanBeBelow && CanBeLeft && !CanBeRight)
					result = Propagate(
						[&] { return r2.x->lq(home, r1.x->max() - r2.width); },
						[&] { return r1.x->gq(home, r2.x->min() + r2.width); }
					);
				else if (!CanBeAbove && CanBeBelow && !CanBeLeft && !CanBeRight)
					result = Propagate(
						[&] { return r2.y->gq(home, r1.y->min() + r1.height); },
						[&] { return r1.y->lq(home, r2.y->max() - r1.height); }
					);
				else if (CanBeAbove && !CanBeBelow && !CanBeLeft && !CanBeRight)
					result = Propagate(
						[&] { return r2.y->lq(home, r1.y->max() - r2.height); },
						[&] { return r1.y->gq(home, r2.y->min() + r2.height); }
					);

				if (result.Status == Gecode::ES_FAILED)
					return Gecode::ES_FAILED;
			}
			if (CannotOverlap)
			{
				r1.x->cancel(home, *this, Gecode::Int::PC_INT_BND);
				r1.y->cancel(home, *this, Gecode::Int::PC_INT_BND);
				
				if (--NumVars == 1) // Subsumption achieved
					break;
			}
		}
		if (NumVars == 1)
			return home.ES_SUBSUMED(*this);
		else
			return (result.PropagationDone ? Gecode::ES_NOFIX : Gecode::ES_FIX);
	}

	virtual void operator = (const NoOverlap&) {}
};

template<typename T>
XGecodeVector2<T> CreateVector(int Width, const T& elem, Gecode::Space& home)
{
	return XGecodeVector2<T>(home, Width, elem);
}

template<typename T>
XGecodeVector2<int> CreateVector(int Width, const T& elem, Gecode::Home& home)
{
	return CreateVector(Width, elem, static_cast<Gecode::Space&>(home));
}

inline Gecode::ViewArray<Gecode::Int::IntView> Clone(Gecode::Home home, const Gecode::IntVarArgs& array)
{
	return Gecode::ViewArray<Gecode::Int::IntView>(home, array);
}

inline XGecodeVector2<int> Clone(Gecode::Home home, const Gecode::IntArgs& array)
{
	auto && vec = CreateVector(array.size(), 0, home);
	std::copy(array.begin(), array.end(), vec.v().begin()); // Not a problem: space has been allocated
	return std::move(vec);
}

template<typename Propagator_t, typename... T>
void CreatePropagator(Gecode::Home home, Gecode::PropCond prop_cond, T&... args)
{
	// Never post a propagator in a failed space
	if (home.failed()) return;

	// If posting failed, fail space
	if (Propagator_t::post(home, prop_cond, Clone(home, args)...) != Gecode::ES_OK)
		home.fail();
}

/*
* Post the constraint that the rectangles defined by the coordinates
* x and m_y and m_width w and m_height h do not overlap.
*
* This is the function that you will call from your model. The best
* is to paste the entire file into your model.
*/

void nooverlap(Gecode::Home home, 
			   const Gecode::IntVarArgs& x, const Gecode::IntArgs& width,
			   const Gecode::IntVarArgs& y, const Gecode::IntArgs& height) 
{
	// Check whether the arguments make sense
	if ((x.size() != y.size()) || (x.size() != width.size()) ||
		(y.size() != height.size()))
		throw Gecode::Int::ArgumentSizeMismatch("nooverlap");

	CreatePropagator<NoOverlap>(home, Gecode::Int::PC_INT_BND, x, width, y, height);
}