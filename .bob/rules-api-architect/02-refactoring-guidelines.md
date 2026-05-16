# Function Refactoring Guidelines for Api-Architect Mode

## Overview
This document provides guidelines for AI-powered function refactoring, ensuring code improvements maintain quality, readability, and functionality.

## Refactoring Goals

### 1. Performance Optimization
**When to apply**: Functions with slow execution, inefficient algorithms, or unnecessary operations.

**Techniques**:
- Replace O(n²) algorithms with O(n log n) or O(n)
- Use list comprehensions instead of loops where appropriate
- Cache expensive computations
- Use generators for large datasets
- Optimize database queries (avoid N+1 problems)

**Example**:
```python
# ❌ BEFORE: Inefficient nested loops
def find_duplicates(items: List[str]) -> List[str]:
    duplicates = []
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] == items[j] and items[i] not in duplicates:
                duplicates.append(items[i])
    return duplicates

# ✅ AFTER: Optimized with set operations
def find_duplicates(items: List[str]) -> List[str]:
    """Find duplicate items efficiently using set operations."""
    seen = set()
    duplicates = set()
    for item in items:
        if item in seen:
            duplicates.add(item)
        seen.add(item)
    return list(duplicates)
```

### 2. Error Handling Enhancement
**When to apply**: Functions lacking proper error handling or validation.

**Techniques**:
- Add try-except blocks for external operations
- Validate inputs at function entry
- Use HTTPException for API endpoints
- Provide meaningful error messages
- Log errors appropriately

**Example**:
```python
# ❌ BEFORE: No error handling
def fetch_user(user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    return user.to_dict()

# ✅ AFTER: Comprehensive error handling
def fetch_user(user_id: int) -> Dict[str, Any]:
    """
    Fetch user by ID with proper error handling.
    
    Args:
        user_id: User identifier
        
    Returns:
        User data dictionary
        
    Raises:
        HTTPException: 400 if user_id is invalid
        HTTPException: 404 if user not found
        HTTPException: 500 if database error occurs
    """
    if user_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="User ID must be positive"
        )
    
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"User with ID {user_id} not found"
            )
        return user.to_dict()
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Database error occurred"
        )
```

### 3. Code Readability Improvement
**When to apply**: Complex, hard-to-understand functions.

**Techniques**:
- Extract complex logic into helper functions
- Use descriptive variable names
- Add comments for non-obvious logic
- Reduce nesting levels
- Follow single responsibility principle

**Example**:
```python
# ❌ BEFORE: Complex nested logic
def process_order(order_data):
    if order_data['status'] == 'pending':
        if order_data['payment_method'] == 'credit_card':
            if order_data['amount'] > 1000:
                discount = order_data['amount'] * 0.1
                final_amount = order_data['amount'] - discount
                return {'amount': final_amount, 'discount': discount}
            else:
                return {'amount': order_data['amount'], 'discount': 0}
        else:
            return {'amount': order_data['amount'], 'discount': 0}
    return None

# ✅ AFTER: Clear, readable structure
def process_order(order_data: Dict[str, Any]) -> Optional[Dict[str, float]]:
    """
    Process order and calculate final amount with applicable discounts.
    
    Args:
        order_data: Order information including status, payment method, and amount
        
    Returns:
        Dictionary with final amount and discount, or None if order not pending
    """
    if order_data['status'] != 'pending':
        return None
    
    amount = order_data['amount']
    discount = _calculate_discount(amount, order_data['payment_method'])
    
    return {
        'amount': amount - discount,
        'discount': discount
    }

def _calculate_discount(amount: float, payment_method: str) -> float:
    """Calculate discount based on amount and payment method."""
    if payment_method == 'credit_card' and amount > 1000:
        return amount * 0.1
    return 0.0
```

### 4. Type Safety Enhancement
**When to apply**: Functions missing type hints or using `Any` excessively.

**Techniques**:
- Add type hints to all parameters and return values
- Use specific types instead of `Any`
- Leverage Union, Optional, and TypedDict
- Add runtime validation with Pydantic

**Example**:
```python
# ❌ BEFORE: No type hints
def create_user(data):
    user = User(**data)
    db.add(user)
    db.commit()
    return user

# ✅ AFTER: Full type safety
from typing import Dict, Any
from pydantic import BaseModel

class UserCreateData(BaseModel):
    username: str
    email: str
    age: int

def create_user(data: UserCreateData) -> User:
    """
    Create a new user with validated data.
    
    Args:
        data: Validated user creation data
        
    Returns:
        Created user instance
        
    Raises:
        HTTPException: 400 if validation fails
        HTTPException: 409 if user already exists
    """
    user = User(
        username=data.username,
        email=data.email,
        age=data.age
    )
    db.add(user)
    db.commit()
    return user
```

### 5. Documentation Enhancement
**When to apply**: Functions lacking docstrings or unclear documentation.

**Techniques**:
- Add comprehensive docstrings
- Document parameters, return values, and exceptions
- Include usage examples for complex functions
- Add inline comments for complex logic

**Example**:
```python
# ❌ BEFORE: No documentation
def calculate_total(items, tax_rate, discount):
    subtotal = sum(item['price'] * item['quantity'] for item in items)
    tax = subtotal * tax_rate
    total = subtotal + tax - discount
    return total

# ✅ AFTER: Well-documented
def calculate_total(
    items: List[Dict[str, float]],
    tax_rate: float,
    discount: float = 0.0
) -> float:
    """
    Calculate total order amount including tax and discount.
    
    Args:
        items: List of items with 'price' and 'quantity' keys
        tax_rate: Tax rate as decimal (e.g., 0.08 for 8%)
        discount: Discount amount to subtract from total (default: 0.0)
        
    Returns:
        Final total amount after tax and discount
        
    Raises:
        ValueError: If tax_rate is negative or discount exceeds subtotal
        
    Example:
        >>> items = [{'price': 10.0, 'quantity': 2}, {'price': 5.0, 'quantity': 1}]
        >>> calculate_total(items, tax_rate=0.08, discount=2.0)
        25.0
    """
    if tax_rate < 0:
        raise ValueError("Tax rate cannot be negative")
    
    # Calculate subtotal from all items
    subtotal = sum(item['price'] * item['quantity'] for item in items)
    
    # Apply tax
    tax = subtotal * tax_rate
    
    # Calculate final total
    total = subtotal + tax - discount
    
    if total < 0:
        raise ValueError("Discount cannot exceed subtotal plus tax")
    
    return round(total, 2)
```

## Refactoring Process

### Step 1: Analyze Current Code
- Identify code smells and anti-patterns
- Measure current performance (if applicable)
- Document current behavior and edge cases
- Review existing tests

### Step 2: Plan Refactoring
- Define specific improvement goals
- Identify breaking changes (if any)
- Plan backward compatibility strategy
- Estimate impact on dependent code

### Step 3: Implement Changes
- Make incremental changes
- Preserve function signature (unless explicitly requested)
- Maintain existing behavior
- Add new tests for edge cases

### Step 4: Validate
- Run existing tests
- Add new tests for refactored code
- Verify performance improvements
- Check for regressions

## Preservation Rules

### Always Preserve (unless explicitly requested):
1. **Function signature**: Parameter names, types, and order
2. **Return type**: Type and structure of return value
3. **Public API**: External interface and behavior
4. **Side effects**: Database operations, file I/O, etc.

### Safe to Change:
1. **Internal implementation**: Algorithm and logic
2. **Variable names**: Internal variable naming
3. **Code structure**: Loops, conditionals, helper functions
4. **Performance characteristics**: As long as behavior is preserved

## Common Refactoring Patterns

### Extract Method
Break down large functions into smaller, focused functions:
```python
# Before: One large function
def process_payment(order):
    # 50 lines of payment processing logic
    pass

# After: Extracted methods
def process_payment(order: Order) -> PaymentResult:
    validate_payment_details(order)
    charge_result = charge_payment_method(order)
    update_order_status(order, charge_result)
    send_confirmation_email(order)
    return charge_result
```

### Replace Conditional with Polymorphism
Use strategy pattern for complex conditionals:
```python
# Before: Complex conditionals
def calculate_shipping(order_type, weight):
    if order_type == 'express':
        return weight * 5.0
    elif order_type == 'standard':
        return weight * 2.0
    elif order_type == 'economy':
        return weight * 1.0

# After: Strategy pattern
class ShippingStrategy(ABC):
    @abstractmethod
    def calculate(self, weight: float) -> float:
        pass

class ExpressShipping(ShippingStrategy):
    def calculate(self, weight: float) -> float:
        return weight * 5.0

def calculate_shipping(strategy: ShippingStrategy, weight: float) -> float:
    return strategy.calculate(weight)
```

## Refactoring Checklist

Before completing refactoring:

- [ ] Original functionality preserved
- [ ] Function signature maintained (if required)
- [ ] Type hints added/improved
- [ ] Error handling enhanced
- [ ] Documentation updated
- [ ] Tests pass
- [ ] Performance measured (if applicable)
- [ ] Code review completed
- [ ] No new security vulnerabilities
- [ ] Backward compatibility maintained

## Anti-Patterns to Avoid

1. **Over-engineering**: Don't add unnecessary complexity
2. **Premature optimization**: Profile before optimizing
3. **Breaking changes**: Avoid unless explicitly requested
4. **Removing error handling**: Never reduce error handling
5. **Unclear abstractions**: Keep code understandable

## References

- Clean Code by Robert C. Martin
- Refactoring by Martin Fowler
- Python Design Patterns: https://refactoring.guru/design-patterns/python
- FastAPI Best Practices: https://fastapi.tiangolo.com/tutorial/