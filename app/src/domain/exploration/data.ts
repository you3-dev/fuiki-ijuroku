import type { RegionNodeId } from './types'

export type RegionNode = {
  id: RegionNodeId
  name: string
  code: string
  summary: string
}

export const graymossNodes: Record<RegionNodeId, RegionNode> = {
  'marsh-entrance': {
    id: 'marsh-entrance',
    name: '湿原入口',
    code: 'GM-01',
    summary: '灰色へ変わる苔の反応から、水に混じる遺跡波動を調べる。',
  },
  'graymoss-shallows': {
    id: 'graymoss-shallows',
    name: '灰苔の浅瀬',
    code: 'GM-02',
    summary: '黒く濁った半透明の異獣が、濾過膜を地面へ擦りつけている。',
  },
  'observation-tower': {
    id: 'observation-tower',
    name: '観測櫓跡',
    code: 'GM-03A',
    summary: '霧の向こうに、上流弁の反射板が残されている。',
  },
  'sunken-waterway': {
    id: 'sunken-waterway',
    name: '沈み水路',
    code: 'GM-03B',
    summary: '黒い沈殿物の下で、下流側の水路が止まっている。',
  },
  'filter-grove': {
    id: 'filter-grove',
    name: '濾過樹群',
    code: 'GM-04',
    summary: '遺跡波動に震える樹根の間で、石殻の異獣が小型装置を守っている。',
  },
  'purification-core': {
    id: 'purification-core',
    name: '浄化施設中枢',
    code: 'GM-05',
    summary: '復旧した水路の先で、黒紫の生命核と古代管路が脈動している。',
  },
}
