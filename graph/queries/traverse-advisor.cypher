// Parameters: $advisorId = "Advisor:ADV-1042"
MATCH (root:Entity {id: $advisorId})
MATCH p=(root)-[*0..8]-(node:Entity)
WITH DISTINCT node
RETURN node.id AS id,
       node.type AS type,
       node.businessId AS businessId,
       node.label AS label,
       node.amount AS amount
LIMIT 100;

// Parameters: $nodeIds = IDs returned by the first query
MATCH (source:Entity)-[relationship]->(target:Entity)
WHERE source.id IN $nodeIds AND target.id IN $nodeIds
RETURN DISTINCT source.id AS source,
       target.id AS target,
       type(relationship) AS relationship
LIMIT 300;
