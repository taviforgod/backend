import {
  getTitles, addTitle, updateTitle, deleteTitle,
  getGenders, addGender, updateGender, deleteGender,
  getMaritalStatuses, addMaritalStatus, updateMaritalStatus, deleteMaritalStatus,
  getMemberTypes, addMemberType, updateMemberType, deleteMemberType,
  getMemberStatuses, addMemberStatus, updateMemberStatus, deleteMemberStatus,
  getNationalities, addNationality, updateNationality, deleteNationality,
  getChurches, addChurch, updateChurch, deleteChurch 
} from '../models/lookupModel.js';

// Get all lookups
export const getAllLookups = async (req, res) => {
  const [titles, genders, marital_statuses, member_types, member_statuses, nationalities, churches] = await Promise.all([
    getTitles(),
    getGenders(),
    getMaritalStatuses(),
    getMemberTypes(),
    getMemberStatuses(),
    getNationalities(),
    getChurches() // <-- Add churches to the lookups
  ]);
  res.json({ titles, genders, marital_statuses, member_types, member_statuses, nationalities, churches });
};

// Titles
export const getAllTitles = async (req, res) => res.json(await getTitles());
export const createTitle = async (req, res) => res.json(await addTitle(req.body.name));
export const editTitle = async (req, res) => res.json(await updateTitle(req.params.id, req.body.name));
export const removeTitle = async (req, res) => res.json(await deleteTitle(req.params.id));

// Genders
export const getAllGenders = async (req, res) => res.json(await getGenders());
export const createGender = async (req, res) => res.json(await addGender(req.body.name));
export const editGender = async (req, res) => res.json(await updateGender(req.params.id, req.body.name));
export const removeGender = async (req, res) => res.json(await deleteGender(req.params.id));

// Marital Statuses
export const getAllMaritalStatuses = async (req, res) => res.json(await getMaritalStatuses());
export const createMaritalStatus = async (req, res) => res.json(await addMaritalStatus(req.body.name));
export const editMaritalStatus = async (req, res) => res.json(await updateMaritalStatus(req.params.id, req.body.name));
export const removeMaritalStatus = async (req, res) => res.json(await deleteMaritalStatus(req.params.id));

// Member Types
export const getAllMemberTypes = async (req, res) => res.json(await getMemberTypes());
export const createMemberType = async (req, res) => res.json(await addMemberType(req.body.name));
export const editMemberType = async (req, res) => res.json(await updateMemberType(req.params.id, req.body.name));
export const removeMemberType = async (req, res) => res.json(await deleteMemberType(req.params.id));

// Member Statuses
export const getAllMemberStatuses = async (req, res) => res.json(await getMemberStatuses());
export const createMemberStatus = async (req, res) => res.json(await addMemberStatus(req.body.name));
export const editMemberStatus = async (req, res) => res.json(await updateMemberStatus(req.params.id, req.body.name));
export const removeMemberStatus = async (req, res) => res.json(await deleteMemberStatus(req.params.id));

// Nationalities
export const getAllNationalities = async (req, res) => res.json(await getNationalities());
export const createNationality = async (req, res) => res.json(await addNationality(req.body.name));
export const editNationality = async (req, res) => res.json(await updateNationality(req.params.id, req.body.name));
export const removeNationality = async (req, res) => res.json(await deleteNationality(req.params.id));

// Churches
export const getAllChurches = async (req, res) => res.json(await getChurches());
export const createChurch = async (req, res) => res.json(await addChurch(req.body.name));
export const editChurch = async (req, res) => res.json(await updateChurch(req.params.id, req.body.name));
export const removeChurch = async (req, res) => res.json(await deleteChurch(req.params.id));