// Small frozen live probe for cross-chunk participant resolution and quoted-entity recovery.
export const contextLiveScenarios = [
  {
    id:'CC01', family:'unique-cross-chunk-company-reference', expectedSupported:true,
    sourceText:'Northstar Metals is a mining company. The Company’s cobalt production rose to 20,000 tonnes in 2025.',
    chunks:[
      {chunk_id:'CC01-A',source_id:'CC01-S',start_offset:0,text_content:'Northstar Metals is a mining company.'},
      {chunk_id:'CC01-B',source_id:'CC01-S',start_offset:38,text_content:'The Company’s cobalt production rose to 20,000 tonnes in 2025.'},
    ],
    entities:[
      {type:'COMPANY',name:'Northstar Metals',entityId:'CC01-E1',canonicalEntityId:'CC01-E1',sourceId:'CC01-S',chunkId:'CC01-A',startOffset:0},
      {type:'PRODUCT',name:'cobalt',entityId:'CC01-E2',sourceId:'CC01-S',chunkId:'CC01-B',startOffset:52},
    ],
    expected:{predicate:'PRODUCES',sourceName:'Northstar Metals',targetName:'cobalt'},
  },
  {
    id:'CC02', family:'ambiguous-cross-chunk-company-reference', expectedSupported:false,
    sourceText:'Aster Corp merged with Beacon Ltd. The company’s graphite production increased.',
    chunks:[
      {chunk_id:'CC02-A',source_id:'CC02-S',start_offset:0,text_content:'Aster Corp merged with Beacon Ltd.'},
      {chunk_id:'CC02-B',source_id:'CC02-S',start_offset:35,text_content:'The company’s graphite production increased.'},
    ],
    entities:[
      {type:'COMPANY',name:'Aster Corp',entityId:'CC02-E1',canonicalEntityId:'CC02-E1',sourceId:'CC02-S',chunkId:'CC02-A',startOffset:0},
      {type:'COMPANY',name:'Beacon Ltd',entityId:'CC02-E2',canonicalEntityId:'CC02-E2',sourceId:'CC02-S',chunkId:'CC02-A',startOffset:21},
      {type:'PRODUCT',name:'graphite',entityId:'CC02-E3',sourceId:'CC02-S',chunkId:'CC02-B',startOffset:49},
    ],
  },
  {
    id:'CC03', family:'quoted-unique-type-participant-recovery', expectedSupported:true,
    sourceText:'Palladium Works produces rhodium.',
    chunks:[{chunk_id:'CC03-A',source_id:'CC03-S',start_offset:0,text_content:'Palladium Works produces rhodium.'}],
    entities:[{type:'COMPANY',name:'Palladium Works',entityId:'CC03-E1',canonicalEntityId:'CC03-E1',sourceId:'CC03-S',chunkId:'CC03-A',startOffset:0}],
    expected:{predicate:'PRODUCES',sourceName:'Palladium Works',targetName:'rhodium'},
  },
]
