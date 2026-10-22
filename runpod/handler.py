def calculate_restock(inventory_data):
    """
    Takes a list of inventory items, checks if they are low on stock,
    and calculates the recommended order quantity.
    """
    recommendations = []
    
    for item in inventory_data:
        stock = item.get("stock", 0)
        threshold = item.get("threshold", 0)
        
        # If the stock is below the safety threshold, trigger a reorder
        if stock < threshold:
            # Smart logic: Order enough to cover the threshold, plus a buffer of 50
            order_qty = (threshold - stock) + 50
            
            recommendations.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "current_stock": stock,
                "recommended_order": order_qty,
                "supplier": item.get("supplier", "Default Supplier"),
                "reason": f"Stock ({stock}) is below safety threshold ({threshold})."
            })
            
    return recommendations