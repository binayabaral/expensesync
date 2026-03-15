CREATE INDEX "idx_sc_created_by" ON "split_contacts" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_sc_linked_user" ON "split_contacts" USING btree ("linked_user_id");--> statement-breakpoint
CREATE INDEX "idx_ses_expense_id" ON "split_expense_shares" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "idx_ses_contact_id" ON "split_expense_shares" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_se_group_id" ON "split_expenses" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_se_created_by" ON "split_expenses" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_sgm_group_user" ON "split_group_members" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_sgm_user_id" ON "split_group_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sgm_group_contact" ON "split_group_members" USING btree ("group_id","contact_id");--> statement-breakpoint
CREATE INDEX "idx_ss_group_id" ON "split_settlements" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_ss_created_by" ON "split_settlements" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_ss_from_contact" ON "split_settlements" USING btree ("from_contact_id");--> statement-breakpoint
CREATE INDEX "idx_ss_to_contact" ON "split_settlements" USING btree ("to_contact_id");--> statement-breakpoint
CREATE INDEX "idx_ss_batch_id" ON "split_settlements" USING btree ("settle_groups_batch_id");