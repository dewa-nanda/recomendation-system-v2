import { Router } from 'express';
import fuzzyAHP from '../functions/fuzzy_ahp/index.js';
import mabac from '../functions/mabac/index.js';
import admin from '../config/firebase.js';
import { body, validationResult } from 'express-validator';

const router = Router();

function sortDataByFinalValue(data, ascending = true) {
  return data.sort((a, b) => ascending ? a.final_value - b.final_value : b.final_value - a.final_value);
}

const schema = [
  body('address').notEmpty().withMessage("address is required!"),
  body('sub_address').notEmpty().withMessage("sub_address is required!")
];

router.get('/', (req, res) => {
  const f = fuzzyAHP();
  res.send({ fuzzyAHP: f });
});

router.post('/', schema, async (req, res) => {
  const validation = validationResult(req);
  if (!validation.isEmpty()) {
    return res.status(400).send(validation);
  }

  const { address, sub_address, type } = req.body;
  const db = admin.firestore();

  let list_zonation = [];
  let list_distance = [];
  let list_school = [];
  let list_address = [];
  let list_subaddress = [];
  let result = [];

  let distance_user = {
    zonation: '',
    address,
    sub_address
  };

  // Get zonation
  let snapshot = await db.collection("zonation").get();
  snapshot.forEach((doc) => {
    const data = doc.data();
    list_zonation.push(data);
    if (data.address.includes(address)) {
      distance_user.zonation = data.id;
    }
  });

  // Get schools (with optional filter)
  let schoolQuery = db.collection("schools");
  if (type) schoolQuery = schoolQuery.where("type", "==", type);

  snapshot = await schoolQuery.get();
  snapshot.forEach(doc => list_school.push(doc.data()));

  // Address
  snapshot = await db.collection("address").get();
  snapshot.forEach(doc => list_address.push(doc.data()));

  // Sub-address
  snapshot = await db.collection("sub-address").get();
  snapshot.forEach(doc => list_subaddress.push(doc.data()));

  // Distance
  snapshot = await db.collection("distance").get();
  snapshot.forEach((doc) => {
    const data = doc.data();
    const priority = {
      priority_1: data.priority_1.address_id === distance_user.zonation || data.priority_1.address_id === 'zonation-all',
      priority_2: data.priority_2.address_id === distance_user.address,
      priority_3: data.priority_3.address_id === distance_user.sub_address,
    };

    let detail = { id: 'priority_0', value: 0 };
    if (priority.priority_1) detail = { id: 'priority_1', value: 1 };
    if (priority.priority_2) detail = { id: 'priority_2', value: 2 };
    if (priority.priority_3) detail = { id: 'priority_3', value: 3 };

    list_distance.push({
      id: data.id,
      school_id: data.school_id,
      name: data,
      detail: data,
      result: {
        ...detail,
        zonation: list_zonation.find(v => v.id === distance_user.zonation)?.name ?? '',
        address: list_address.find(v => v.id === distance_user.address)?.name ?? '',
        sub_address: list_subaddress.find(v => v.id === distance_user.sub_address)?.name ?? ''
      }
    });
  });

  // Main fusion
  result = list_school.map((school) => {
    const distance_detail = list_distance.find((v) => v.school_id === school.id);
    const distance_value = distance_detail?.result ?? { id: 'priority_0', value: 0 };

    const accreditation_value = school.accreditation === 'A' ? 3 : school.accreditation === 'B' ? 2 : 1;
    const facility_value = school.facility === 'memadai' ? 3 : school.facility === 'setara' ? 2 : 1;

    const zonation = list_zonation.find(v => v.id === list_distance.find(v => v.school_id === school.id)?.name.priority_1.address_id)?.name ?? 'A, B, C, D, E';

    return {
      id: school.id,
      name: school.name,
      type: school.type,
      category: school.category,
      address: list_address.find(v => v.id === distance_detail?.detail?.priority_2?.address_id)?.name ?? '',
      sub_address: list_subaddress.find(v => v.id === distance_detail?.detail?.priority_3?.address_id)?.name ?? '',
      zonation,
      link_profile: school.link_profile,
      distance: distance_value,
      facility: { name: school.facility, value: facility_value },
      accreditation: { name: school.accreditation, value: accreditation_value }
    };
  });

  result = result.filter(v => v.zonation === list_zonation.find(v => v.id === distance_user.zonation)?.name);

  // Fuzzy AHP & Mabac
  const f = fuzzyAHP();
  const weights = f.value.w;
  const m = mabac(weights, result);

  let final_result = result.map((school) => ({
    ...school,
    final_value: m.find(v => v.id === school.id)?.value ?? null
  }));

  // Grouping by priority distance
  const near = final_result.filter(v => v.distance.value === 3);
  const mid = final_result.filter(v => v.distance.value === 2);
  const far = final_result.filter(v => v.distance.value === 1);

  let filtered = [...sortDataByFinalValue(near, false), ...sortDataByFinalValue(mid, false), ...sortDataByFinalValue(far, false)];
  filtered = Array.from(new Map(filtered.map(v => [v.id, v])).values());

  const negeri = final_result.filter(v => v.category === 'negeri');
  const swasta = final_result.filter(v => v.category === 'swasta');

  const negeri_filtered = filtered.filter(v => v.category === 'negeri');
  const swasta_filtered = filtered.filter(v => v.category === 'swasta');

  final_result = {
    default: {
      negeri: {
        data: sortDataByFinalValue(negeri, false).slice(0, 10),
        total: negeri.length
      },
      swasta: {
        data: sortDataByFinalValue(swasta, false).slice(0, 10),
        total: swasta.length
      }
    },
    filtered: {
      negeri: {
        data: negeri_filtered.slice(0, 10),
        total: negeri_filtered.length
      },
      swasta: {
        data: swasta_filtered.slice(0, 10),
        total: swasta_filtered.length
      }
    }
  };

  res.send({ fuzzyAhp: f, result: final_result });
});

export default router;
