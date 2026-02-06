jest.mock('../../models/leadershipModel.js');
jest.mock('../../models/memberModel.js');
jest.mock('../../models/notificationModel.js');

import { requestApproval } from '../../controllers/leadershipCtrl.js';
import * as leadershipModel from '../../models/leadershipModel.js';
import * as memberModel from '../../models/memberModel.js';

describe('requestApproval zone snapshot', () => {
  it('passes member.zone_id into addReadinessApproval', async () => {
    memberModel.getMemberById.mockResolvedValue({ id: 123, zone_id: 55 });
    leadershipModel.addReadinessApproval.mockResolvedValue({});

    const req = { user: { church_id: 1, userId: 2 }, params: { leaderId: '123' } };
    const res = { json: jest.fn(), status: jest.fn(() => res) };

    await requestApproval(req, res);

    expect(leadershipModel.addReadinessApproval).toHaveBeenCalledWith(expect.objectContaining({ zone_id: 55 }));
  });
});