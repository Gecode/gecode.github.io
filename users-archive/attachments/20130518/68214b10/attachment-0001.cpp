#include <gecode/int.hh>
#include <array>
#include <iterator>
#include <algorithm>
#include <assert.h>
#include <vector>
#include <iostream>
#include <assert.h>

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
	XGecodeVector2<XRectangle2> m_rectangles;

public:
	NoOverlap(Gecode::Home home, 
		Gecode::ViewArray<Gecode::Int::IntView>& x, XGecodeVector2<int>& width, 
		Gecode::ViewArray<Gecode::Int::IntView>& y, XGecodeVector2<int>& height):
			Gecode::Propagator(home), m_x(x), m_y(y), m_width(std::move(width)), m_height(std::move(height)),
				m_rectangles(home)
	{
		m_x.subscribe(home, *this, Gecode::Int::PC_INT_BND);
		m_y.subscribe(home, *this, Gecode::Int::PC_INT_BND);
		for (size_t i = 0; i < m_x.size(); i++)
			m_rectangles.v().push_back(CreateRectangle2(i));
	}

	NoOverlap(Gecode::Space& home, bool Share, NoOverlap& that): Gecode::Propagator(home, Share, that), 
		m_x(that.m_x), m_y(that.m_y), m_width(home, that.m_width), m_height(home, that.m_height),
		m_rectangles(home)
	{
		m_x.update(home, Share, that.m_x);
		m_y.update(home, Share, that.m_y);
		for (size_t i = 0; i < m_x.size(); i++)
			m_rectangles.v().push_back(CreateRectangle2(i));
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
		{
			NoOverlap* ThisPtr = new (home) NoOverlap(home, x, args...);
#ifdef _DEBUG
			//home.notice(*ThisPtr, Gecode::AP_DISPOSE);
#endif
		}
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
	XRectangle2 CreateRectangle2(size_t var_id)
	{
		XRectangle2 rect = { &m_x[(int)var_id], &m_y[(int)var_id],
			m_width.v().at(var_id), m_height.v().at(var_id) };
		assert(rect.width > 0);
		assert(rect.height > 0);
		assert(rect.width == rect.height);
		return rect;
	}

	virtual Gecode::ExecStatus propagate(Gecode::Space& home, const Gecode::ModEventDelta&)
	{
		size_t NumVars = (size_t)m_rectangles.v().size();

		// This variable remembers if any propagation was done or not. Used to know if we are at fixpoint or not.
		bool PropagationDone = false;

		// For every variable...
		for (size_t idx_r1 = 0; idx_r1 < NumVars - 1; idx_r1++)
		{
			// If true if the current square (idx_r1) cannot overlap with any other square.
			bool CannotOverlap = false; 

			// For every other variable + symmetry breaking
			// Consider: When checking square 0, we want to start checking from square 1 since comparing against itself is pointless.
			// Then, consider when checking square 1, due to symmetry, we don't need to check against square 0 (already did it).
			// Generalizing this, square k has already been checked for squares 0...k-1, so we can start from k+1.
			for (size_t idx_r2 = idx_r1 + 1; idx_r2 < NumVars; idx_r2++)
			{
				CannotOverlap = true;
				const auto & r1 = m_rectangles.v().at(idx_r1);
				const auto & r2 = m_rectangles.v().at(idx_r2);
					
				// Helper function that checks result of propagation. Updates propagation variable if propagation was done.
				// Fails if the propagation failed.
				auto CheckResult = [&](Gecode::ModEvent status)
				{
					switch (status)
					{
						case Gecode::Int::ME_INT_NONE: PropagationDone = PropagationDone || false; break;
						case Gecode::Int::ME_INT_FAILED: return Gecode::ES_FAILED;
						default: PropagationDone = true; break;
					}
					return Gecode::ES_OK;
				};

				if (!CanBeAbove && !CanBeBelow && !CanBeLeft && CanBeRight)
					result = CheckResult( r2.x->gq(home, r1.x->min() + r1.width) );
				else if (!CanBeAbove && !CanBeBelow && CanBeLeft && !CanBeRight)
					result = CheckResult( r2.x->lq(home, r1.x->max() - r2.width) );
				else if (!CanBeAbove && CanBeBelow && !CanBeLeft && !CanBeRight)
					result = CheckResult( r2.y->gq(home, r1.y->min() + r1.height) );
				else if (CanBeAbove && !CanBeBelow && !CanBeLeft && !CanBeRight)
					result = CheckResult( r2.y->lq(home, r1.y->max() - r2.height) );
				if (result == Gecode::ES_FAILED)
					return Gecode::ES_FAILED;
			}
			if (CannotOverlap)
			{
				auto & r1 = m_rectangles.v().at(idx_r1);
				r1.x->cancel(home, *this, Gecode::Int::PC_INT_BND);
				r1.y->cancel(home, *this, Gecode::Int::PC_INT_BND);
				r1 = std::move(m_rectangles.v().back());
				m_rectangles.v().pop_back();
				
				if (--NumVars == 1) // Subsumption achieved
					break;

				// Restart loop again
				idx_r1--;
			}
		}
		if (m_rectangles.v().size() == 1)
			return home.ES_SUBSUMED(*this);
		else
			return (PropagationDone ? Gecode::ES_NOFIX : Gecode::ES_FIX);
	}
};

void nooverlap(Gecode::Home home, 
			   const Gecode::IntVarArgs& x, const Gecode::IntArgs& width,
			   const Gecode::IntVarArgs& y, const Gecode::IntArgs& height) 
{
	// Check whether the arguments make sense
	if ((x.size() != y.size()) || (x.size() != width.size()) ||
		(y.size() != height.size()))
		throw Gecode::Int::ArgumentSizeMismatch("nooverlap");

	assert((size_t)x.size() == (size_t)y.size() && (size_t)y.size() == (size_t)width.size() &&
		(size_t)width.size() == (size_t)height.size());
	CreatePropagator<NoOverlap>(home, Gecode::Int::PC_INT_BND, x, width, y, height);
}

template<typename T, template<typename> class Allocator = Gecode::space_allocator>
class XGecodeVector2
{
private:
	std::vector<T, Allocator<T>> m_v;

public:
	std::vector<T, Allocator<T>>& v() { return m_v; };

	template<typename... Args_t>
	XGecodeVector2(Gecode::Home home, Args_t... Args): m_v(Args..., Allocator<T>(home)) {}

	XGecodeVector2(Gecode::Space& home, const XGecodeVector2& that): m_v(that.m_v.size(), T(), Allocator<T>(home)), m_valid(that.m_valid)
	{
		// Apparently Mingw/Clang does not implement std::vector<T, Allocator<T>>(const std::vector<T>&, Allocator<T>)...
		// So we have to use a workaround!
		std::copy(that.m_v.begin(), that.m_v.end(), m_v.begin());
	}

	XGecodeVector2(XGecodeVector2&& that): m_v(std::move(that.m_v)) {}
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