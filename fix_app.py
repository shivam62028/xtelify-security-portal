import re

with open("app.py", "r") as f:
    content = f.read()

# I messed up the get_analytics_owners endpoint earlier, let's restore it.
# The original code had:
"""
                {"$group": {
                    "_id": {"$ifNull": ["$AssignedTo", "Unassigned"]},
                    "resolved": {"$sum": {"$cond": [{"$in": ["$Status", ["Fixed", "Closed", "Mitigated", "False Positive"]]}, 1, 0]}},
                    "unresolved": {"$sum": {"$cond": [{"$in": ["$Status", ["Fixed", "Closed", "Mitigated", "False Positive"]]}, 0, 1]}}
                }},
"""
# And I accidentally replaced it with that AND the new endpoint. Wait, no, I actually deleted a section.
# Let's just restore the file using git checkout if it's tracked, or just undo my change.
