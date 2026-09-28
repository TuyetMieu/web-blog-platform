import { createNoteSchema, listNotesQuerySchema } from '../schemas/note.schema';
import { noteService } from '../services/note.service';
import { asyncHandler } from '../utils/async-handler';
import { parse } from '../utils/validate';

export const noteController = {
  create: asyncHandler(async (req, res) => {
    await noteService.create(parse(createNoteSchema, req.body ?? {}));
    res.status(201).json({ ok: true });
  }),
  list: asyncHandler(async (req, res) => {
    res.json(await noteService.list(parse(listNotesQuerySchema, req.query)));
  }),
};
