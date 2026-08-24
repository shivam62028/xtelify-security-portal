from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['xtelify_db']
res = list(db.issues.aggregate([{'$group': {'_id': '$SourceFormat', 'count': {'$sum': 1}}}]))
print("SourceFormats:", res)

res2 = list(db.issues.aggregate([{'$group': {'_id': '$UploadBatch', 'format': {'$first': '$SourceFormat'}}}]))
print("Batches:", res2)
